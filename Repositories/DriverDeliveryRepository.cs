using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System.Data;

namespace GayatriCateringPortal.Repositories
{
    public class DriverDeliveryRepository : IDriverDeliveryRepository
    {
        public DriverVerificationVM? VerifyDriverToken(string token)
        {
            DriverVerificationVM? item = null;
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();

                    using (cmd = DataFactory.CreateCommand("SP_VerifyDriverToken", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                        cmd.Parameters.Add(
                            DataFactory.CreateParameter("@Token", token));

                        reader = DataFactory.ExecuteReader(cmd);

                        if (reader.Read())
                        {
                            item = new DriverVerificationVM();

                            item.DriverId = Convert.ToInt32(reader["DriverId"]);
                            item.DriverName = Convert.ToString(reader["Name"])!;
                            item.MobileNo = Convert.ToString(reader["MobileNo"])!;
                            item.Token = Convert.ToString(reader["Token"])!;
                            item.ExpiryDate = Convert.ToDateTime(reader["ExpiryDate"]);
                            item.logisticsId = Convert.ToInt32(reader["LogisticsId"]);
                        }
                    }
                }
            }
            catch (SqlException)
            {
                throw new Exception("Database error");
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null &&
                    conn.State != ConnectionState.Closed)
                    conn.Close();
            }

            return item;
        }

        public bool VerifyOtp(string token, string otp)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();

                    using (cmd = DataFactory.CreateCommand("SP_VerifyDriverOtp", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                        cmd.Parameters.Add(DataFactory.CreateParameter("@Token", token));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@OTP", otp));

                        var result = DataFactory.ExecuteScalar(cmd);

                        if (result != null)
                            return Convert.ToInt32(result) == 1;
                    }
                }
            }
            catch (SqlException)
            {
                throw new Exception("Database error");
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed)
                    conn.Close();
            }

            return false;
        }

        public bool IsDriverSessionValid(int driverId, string token)
        {
            return ExecuteBooleanScalar("SP_IsDriverSessionValid", new Dictionary<string, object?>
            {
                ["@DriverId"] = driverId,
                ["@Token"] = token
            });
        }

        public bool IsLogisticsAssignedToDriver(int logisticsId, int driverId)
        {
            return ExecuteBooleanScalar("SP_DriverHasLogisticsAccess", new Dictionary<string, object?>
            {
                ["@LogisticsId"] = logisticsId,
                ["@DriverId"] = driverId
            });
        }

        public bool CanDriverStartDelivery(int logisticsId, int driverId)
        {
            return ExecuteBooleanScalar("SP_CanDriverStartDelivery", new Dictionary<string, object?>
            {
                ["@LogisticsId"] = logisticsId,
                ["@DriverId"] = driverId
            });
        }

        private static bool ExecuteBooleanScalar(string procedureName, Dictionary<string, object?> parameters)
        {
            using var conn = DataFactory.CreateConnection();
            conn.Open();
            using var cmd = DataFactory.CreateCommand(procedureName, conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

            foreach (var parameter in parameters)
                cmd.Parameters.Add(DataFactory.CreateParameter(parameter.Key, parameter.Value));

            var result = DataFactory.ExecuteScalar(cmd);
            return result != null && result != DBNull.Value && Convert.ToInt32(result) == 1;
        }

        public List<DriverInvoiceVM> GetAssignedInvoices(int? driverId)
        {
            List<DriverInvoiceVM> list = new List<DriverInvoiceVM>();

            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();

                    using (cmd = DataFactory.CreateCommand("SP_GetDriverAssignedInvoices", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                        cmd.Parameters.Add(
                            DataFactory.CreateParameter("@DriverId", driverId));

                        reader = DataFactory.ExecuteReader(cmd);

                        while (reader.Read())
                        {
                            DriverInvoiceVM item = new DriverInvoiceVM();

                            item.LogisticsId = Convert.ToInt32(reader["LogisticsId"]);
                            item.InvoiceId = Convert.ToInt32(reader["InvoiceId"]);
                            item.InvoiceNo = Convert.ToString(reader["InvoiceNo"])!;
                            item.CustomerName = Convert.ToString(reader["CustomerName"])!;
                            item.DeliveryAddress = Convert.ToString(reader["DeliveryAddress"])!;
                            item.EventDate = Convert.ToDateTime(reader["EventDate"]);
                            item.Status = Convert.ToString(reader["Status"])!;

                            list.Add(item);
                        }
                    }
                }
            }
            catch (SqlException)
            {
                throw new Exception("Database error");
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed)
                    conn.Close();
            }

            return list;
        }

        public DriverDeliveryVM? GetInvoiceDetails(int logisticsId)
        {
            DriverDeliveryVM? item = null;

            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();

                    using (cmd = DataFactory.CreateCommand("SP_GetDriverInvoiceDetails", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                        cmd.Parameters.Add(
                            DataFactory.CreateParameter("@LogisticsId", logisticsId));

                        reader = DataFactory.ExecuteReader(cmd);

                        if (reader.Read())
                        {
                            item = new DriverDeliveryVM();

                            item.LogisticsId = Convert.ToInt32(reader["LogisticsId"]);
                            item.DriverId = Convert.ToInt32(reader["DriverId"]);
                            item.InvoiceId = Convert.ToInt32(reader["InvoiceId"]);
                            item.InvoiceNo = Convert.ToString(reader["InvoiceNo"])!;
                            item.CustomerName = Convert.ToString(reader["CustomerName"])!;
                            item.MobileNo = Convert.ToString(reader["MobileNo"])!;
                            item.DeliveryAddress = Convert.ToString(reader["DeliveryAddress"])!;
                            item.EventDate = Convert.ToDateTime(reader["EventDate"]);

                            item.ParcelPhoto = reader["ParcelPhoto"] == DBNull.Value
                                ? ""
                                : Convert.ToString(reader["ParcelPhoto"]);

                            item.CustomerSignature = reader["CustomerSignature"] == DBNull.Value
                                ? ""
                                : Convert.ToString(reader["CustomerSignature"]);

                            //item.Remarks = reader["DeliveryRemarks"] == DBNull.Value
                            //    ? ""
                            //    : Convert.ToString(reader["DeliveryRemarks"]);

                            //item.Latitude = reader["Latitude"] == DBNull.Value
                            //    ? 0
                            //    : Convert.ToDecimal(reader["Latitude"]);

                            //item.Longitude = reader["Longitude"] == DBNull.Value
                            //    ? 0
                            //    : Convert.ToDecimal(reader["Longitude"]);

                            item.DeliveryStatus =
                                Convert.ToString(reader["DeliveryStatus"])!;
                        }
                    }
                }
            }
            catch (SqlException)
            {
                throw new Exception("Database error");
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null &&
                    conn.State != ConnectionState.Closed)
                    conn.Close();
            }

            return item;
        }

        public int SaveDeliveryProof(DeliveryProofVM model)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();

                    byte[] photoBytes = Array.Empty<byte>();

                    if (model.ParcelPhoto != null && model.ParcelPhoto.Length > 0)
                    {
                        using var ms = new MemoryStream();
                        model.ParcelPhoto.CopyTo(ms);
                        photoBytes = ms.ToArray();
                    }

                    using (cmd = DataFactory.CreateCommand("SP_SaveDeliveryProof", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                        cmd.Parameters.Add(DataFactory.CreateParameter("@LogisticsId", model.LogisticsId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@DriverId", model.DriverId));

                        cmd.Parameters.Add(
    DataFactory.CreateParameter(
        "@ParcelPhoto",
        SqlDbType.VarBinary,
        photoBytes
    ));

                        cmd.Parameters.Add(DataFactory.CreateParameter(
                            "@CustomerSignature",
                            SqlDbType.VarBinary,
                            ConvertDigitalSignatureToBytes(model.CustomerSignature)));

                        cmd.Parameters.Add(DataFactory.CreateParameter("@DeliveryRemarks", model.Remarks));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Latitude", model.Latitude));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Longitude", model.Longitude));

                        object result = DataFactory.ExecuteScalar(cmd);

                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (SqlException)
            {
                throw;
            }
            finally
            {
                if (conn != null &&
                    conn.State != ConnectionState.Closed)
                    conn.Close();
            }
        }

        private static byte[]? ConvertDigitalSignatureToBytes(string? imageDataUrl)
        {
            if (string.IsNullOrWhiteSpace(imageDataUrl))
                return null;

            const string prefix = "data:image/png;base64,";

            if (!imageDataUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return null;

            string base64 = imageDataUrl[prefix.Length..].Trim();

            if (string.IsNullOrWhiteSpace(base64))
                return null;

            try
            {
                return Convert.FromBase64String(base64);
            }
            catch (FormatException)
            {
                return null;
            }
        }

        //public bool ExpireToken(string token)
        //{
        //    // SP_ExpireDriverToken
        //}
    }
}
