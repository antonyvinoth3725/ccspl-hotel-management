using System;
using System.Collections.Generic;
using System.Data;
using System.Security.Cryptography;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories
{
    public class LoginRepository : ILoginRepository
    {
        private const int MaxAttempts = 5;

        public List<LoginRoleItem> GetUserRolesByUserId(int userId)
        {
            var roles = new List<LoginRoleItem>();
            if (userId <= 0) return roles;

            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetUserRolesByUserId", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UserId", userId));

                        reader = DataFactory.ExecuteReader(cmd);
                        while (reader.Read())
                        {
                            var roleName = string.Empty;
                            if (HasColumn(reader, "RoleName") && reader["RoleName"] != DBNull.Value)
                            {
                                roleName = Convert.ToString(reader["RoleName"]) ?? string.Empty;
                            }

                            roles.Add(new LoginRoleItem
                            {
                                RoleId = reader["RoleId"] != DBNull.Value ? Convert.ToInt32(reader["RoleId"]) : 0,
                                RoleName = roleName
                            });
                        }
                    }
                }
            }
            catch
            {
                throw;
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }

            return roles;
        }

        public LoginUserInfo? GetUserByEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;

            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_CheckUserByEmail", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", email.Trim()));

                        reader = DataFactory.ExecuteReader(cmd);
                        if (!reader.Read()) return null;

                        return new LoginUserInfo
                        {
                            Id = ReadInt(reader, "Id"),
                            Code = ReadString(reader, "Code"),
                            Name = ReadString(reader, "Name"),
                            Email = ReadString(reader, "Email"),
                            Image = ReadString(reader, "Image"),
                            IsAdmin = ReadBool(reader, "IsAdmin"),
                            IsActive = ReadBool(reader, "IsActive"),
                            IsDeleted = ReadBool(reader, "IsDeleted")
                        };
                    }
                }
            }
            catch
            {
                throw;
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public OtpIssueResult CreateOtp(string email, int expirySeconds)
        {
            var normalizedEmail = NormalizeEmail(email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                throw new Exception("Invalid email.");
            }

            var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            var result = new OtpIssueResult
            {
                Code = code,
                ExpiresInSeconds = expirySeconds,
                ExpiresAtUtc = DateTime.UtcNow.AddSeconds(expirySeconds)
            };

            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_UpsertLoginOtp", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;

                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", normalizedEmail));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@OtpCode", result.Code));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ExpiresAtUtc", result.ExpiresAtUtc));

                        DataFactory.ExecuteNonQuery(cmd);
                    }
                }
            }
            catch
            {
                throw;
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }

            return result;
        }

        public OtpVerifyResult VerifyOtp(string email, string code)
        {
            var normalizedEmail = NormalizeEmail(email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return new OtpVerifyResult { IsValid = false, Message = "Invalid email." };
            }

            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetLoginOtpByEmail", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", normalizedEmail));

                        reader = DataFactory.ExecuteReader(cmd);
                        if (!reader.Read())
                        {
                            return new OtpVerifyResult { IsValid = false, Message = "Please request OTP first." };
                        }

                        var dbCode = reader["OtpCode"] != DBNull.Value ? Convert.ToString(reader["OtpCode"]) : string.Empty;
                        var expiresAtUtc = reader["ExpiresAtUtc"] != DBNull.Value ? Convert.ToDateTime(reader["ExpiresAtUtc"]) : DateTime.MinValue;
                        var attempts = reader["Attempts"] != DBNull.Value ? Convert.ToInt32(reader["Attempts"]) : 0;

                        if (DateTime.UtcNow > DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc))
                        {
                            ClearOtp(normalizedEmail);
                            return new OtpVerifyResult { IsValid = false, Message = "OTP expired. Please resend code." };
                        }

                        if (attempts >= MaxAttempts)
                        {
                            ClearOtp(normalizedEmail);
                            return new OtpVerifyResult { IsValid = false, Message = "Too many invalid attempts. Please resend code." };
                        }

                        if (!string.Equals((code ?? string.Empty).Trim(), (dbCode ?? string.Empty).Trim(), StringComparison.Ordinal))
                        {
                            IncrementOtpAttempt(normalizedEmail);
                            return new OtpVerifyResult
                            {
                                IsValid = false,
                                Message = $"Invalid OTP code. {Math.Max(0, MaxAttempts - (attempts + 1))} attempt(s) left."
                            };
                        }

                        return new OtpVerifyResult { IsValid = true, Message = "OTP validated." };
                    }
                }
            }
            catch
            {
                throw;
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public void ClearOtp(string email)
        {
            var normalizedEmail = NormalizeEmail(email);
            if (string.IsNullOrWhiteSpace(normalizedEmail)) return;

            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_ClearLoginOtp", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", normalizedEmail));

                        DataFactory.ExecuteNonQuery(cmd);
                    }
                }
            }
            catch
            {
                throw;
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        private static string NormalizeEmail(string email)
        {
            return (email ?? string.Empty).Trim().ToLowerInvariant();
        }

        private static string? ReadString(IDataRecord record, string column)
        {
            if (!HasColumn(record, column)) return null;
            var value = record[column];
            return value == DBNull.Value ? null : Convert.ToString(value);
        }

        private static int ReadInt(IDataRecord record, string column)
        {
            if (!HasColumn(record, column)) return 0;
            var value = record[column];
            return value == DBNull.Value ? 0 : Convert.ToInt32(value);
        }

        private static bool ReadBool(IDataRecord record, string column)
        {
            if (!HasColumn(record, column)) return false;
            var value = record[column];
            return value != DBNull.Value && Convert.ToBoolean(value);
        }

        private static bool HasColumn(IDataRecord record, string column)
        {
            for (var i = 0; i < record.FieldCount; i++)
            {
                if (string.Equals(record.GetName(i), column, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private void IncrementOtpAttempt(string email)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_IncrementLoginOtpAttempt", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", email));

                        DataFactory.ExecuteNonQuery(cmd);
                    }
                }
            }
            catch
            {
                throw;
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }
    }
}
