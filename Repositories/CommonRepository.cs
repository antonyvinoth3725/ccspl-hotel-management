using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace GayatriCateringPortal.Repositories
{
    public class CommonRepository : ICommonRepository
    {
        private readonly IConfiguration _configuration;

        public CommonRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public List<MenuGroup> GetMenuGroups(int roleId)
        {
            var list = new List<MenuGroup>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetMenus", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));
                        reader = DataFactory.ExecuteReader(cmd);

                        // single resultset with group + submenu rows
                        var map = new Dictionary<int, MenuGroup>();
                        while (reader.Read())
                        {
                            int groupId = reader["MenuGroupId"] != DBNull.Value ? Convert.ToInt32(reader["MenuGroupId"]) : 0;
                            if (!map.ContainsKey(groupId))
                            {
                                var g = new MenuGroup
                                {
                                    Id = groupId,
                                    Name = reader["MenuGroupName"] != DBNull.Value ? Convert.ToString(reader["MenuGroupName"]) : null,
                                    MenuIcon = reader["MenuGroupIcon"] != DBNull.Value ? Convert.ToString(reader["MenuGroupIcon"]) : null,
                                    DisplayOrder = reader["MenuGroupOrder"] != DBNull.Value ? Convert.ToInt32(reader["MenuGroupOrder"]) : 0
                                };
                                map[groupId] = g;
                            }

                            // submenu may be null when no children
                            if (reader["MenuId"] != DBNull.Value)
                            {
                                var sm = new SubMenu();
                                sm.Id = Convert.ToString(reader["MenuId"])!;
                                sm.MenuId = reader["ParentMenuId"] != DBNull.Value ? Convert.ToString(reader["ParentMenuId"]) : null;
                                sm.Name = reader["MenuName"] != DBNull.Value ? Convert.ToString(reader["MenuName"]) : "";
                                sm.EntityNo = reader["EntityNo"] != DBNull.Value ? Convert.ToString(reader["EntityNo"]) : null;
                                sm.Route = reader["Route"] != DBNull.Value ? Convert.ToString(reader["Route"]) : "";
                                sm.MenuIcon = reader["MenuIcon"] != DBNull.Value ? Convert.ToString(reader["MenuIcon"]) : "";
                                sm.DisplayOrder = reader["MenuOrder"] != DBNull.Value ? Convert.ToString(reader["MenuOrder"]) : "";
                                sm.Remarks = reader["Remarks"] != DBNull.Value ? Convert.ToString(reader["Remarks"]) : "";
                                map[groupId].Menus.Add(sm);
                            }
                        }

                        list.AddRange(map.Values);
                    }
                }

                return list;
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
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public List<Country> GetCountry()
        {
            var list = new List<Country>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetCountry", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        reader = DataFactory.ExecuteReader(cmd);
                        while (reader.Read())
                        {
                            list.Add(new Country
                            {
                                Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                                Name = reader["name"] != DBNull.Value ? Convert.ToString(reader["name"]) : ""
                            });
                        }
                    }
                }

                return list;
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in GetCountry: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public List<State> GetStateByCountryId(int countryId)
        {
            var list = new List<State>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetStateByCountryId", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CountryId", countryId));
                        reader = DataFactory.ExecuteReader(cmd);
                        while (reader.Read())
                        {
                            list.Add(new State
                            {
                                Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                                Name = reader["name"] != DBNull.Value ? Convert.ToString(reader["name"]) : "",
                                CountryId = reader["country_id"] != DBNull.Value ? Convert.ToInt32(reader["country_id"]) : 0
                            });
                        }
                    }
                }

                return list;
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in GetStateByCountryId: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public List<City> GetCityByStateId(int stateId)
        {
            var list = new List<City>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetCityByStateId", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@StateId", stateId));
                        reader = DataFactory.ExecuteReader(cmd);
                        while (reader.Read())
                        {
                            list.Add(new City
                            {
                                Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                                Name = reader["name"] != DBNull.Value ? Convert.ToString(reader["name"]) : "",
                                StateId = reader["state_id"] != DBNull.Value ? Convert.ToInt32(reader["state_id"]) : 0
                            });
                        }
                    }
                }

                return list;
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in GetCityByStateId: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public List<EntityMaster> GetEntityMaster()
        {
            var list = new List<EntityMaster>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetEntityMaster", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        reader = DataFactory.ExecuteReader(cmd);

                        while (reader.Read())
                        {
                            list.Add(new EntityMaster
                            {
                                Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                                Name = reader["Name"] != DBNull.Value ? Convert.ToString(reader["Name"]) : null,
                                EntityNo = reader["EntityNo"] != DBNull.Value ? Convert.ToInt32(reader["EntityNo"]) : null,
                                IsDeleted = reader["IsDeleted"] != DBNull.Value ? Convert.ToBoolean(reader["IsDeleted"]) : null,
                                IsActive = reader["IsActive"] != DBNull.Value ? Convert.ToBoolean(reader["IsActive"]) : null,
                                CreatedBy = reader["CreatedBy"] != DBNull.Value ? Convert.ToInt32(reader["CreatedBy"]) : 0,
                                CreatedDate = reader["CreatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedDate"]) : DateTime.MinValue,
                                UpdatedBy = reader["UpdatedBy"] != DBNull.Value ? Convert.ToInt32(reader["UpdatedBy"]) : null,
                                UpdatedDate = reader["UpdatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["UpdatedDate"]) : null
                            });
                        }
                    }
                }

                return list;
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in GetEntityMaster: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public int CreateRolePermission(List<CreateRolePermissionRequest> requests)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                if (requests == null || requests.Count == 0) return 0;

                int savedCount = 0;
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    for (int i = 0; i < requests.Count; i++)
                    {
                        var request = requests[i];
                        using (cmd = DataFactory.CreateCommand("SP_CreateRolePermission", conn))
                        {
                            var sqlCmd = (SqlCommand)cmd;
                            sqlCmd.CommandType = CommandType.StoredProcedure;
                            sqlCmd.CommandTimeout = 60;

                            cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", request.RoleId));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", request.EntityNo));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@View", request.View));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@Create", request.Create));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@Edit", request.Edit));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@Delete", request.Delete));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@ActiveInActive", request.ActiveInActive));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@Print", request.Print));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@Download", request.Download));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedDate", request.CreatedDate ?? DateTime.Now));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", request.CreatedBy));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedDate", request.UpdatedDate));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", request.UpdatedBy));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", request.IsActive));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", request.IsDeleted));

                            var result = DataFactory.ExecuteScalar(cmd);
                            if (result != null && result != DBNull.Value)
                            {
                                savedCount++;
                            }
                        }
                    }
                }

                return savedCount;
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in CreateRolePermission: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public List<RolePermissionItem> GetRolePermissionsByRoleId(int roleId)
        {
            var list = new List<RolePermissionItem>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetRolePermissionsByRoleId", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));

                        reader = DataFactory.ExecuteReader(cmd);
                        while (reader.Read())
                        {
                            list.Add(new RolePermissionItem
                            {
                                RoleId = reader["RoleId"] != DBNull.Value ? Convert.ToInt32(reader["RoleId"]) : 0,
                                EntityNo = reader["EntityNo"] != DBNull.Value ? Convert.ToInt32(reader["EntityNo"]) : 0,
                                View = reader["View"] != DBNull.Value && Convert.ToBoolean(reader["View"]),
                                Create = reader["Create"] != DBNull.Value && Convert.ToBoolean(reader["Create"]),
                                Edit = reader["Edit"] != DBNull.Value && Convert.ToBoolean(reader["Edit"]),
                                Delete = reader["Delete"] != DBNull.Value && Convert.ToBoolean(reader["Delete"]),
                                ActiveInActive = reader["ActiveInActive"] != DBNull.Value && Convert.ToBoolean(reader["ActiveInActive"]),
                                Download = reader["Download"] != DBNull.Value && Convert.ToBoolean(reader["Download"]),
                                Print = reader["Print"] != DBNull.Value && Convert.ToBoolean(reader["Print"])
                            });
                        }
                    }
                }

                return list;
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in GetRolePermissionsByRoleId: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public RolePermissionItem GetMenuRights(int roleId, int entityNo)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetMenuRightsByEntityNo", conn))
                    {
                        var sqlCmd = (SqlCommand)cmd;
                        sqlCmd.CommandType = CommandType.StoredProcedure;
                        sqlCmd.CommandTimeout = 60;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", entityNo));

                        reader = DataFactory.ExecuteReader(cmd);
                        if (reader.Read())
                        {
                            return new RolePermissionItem
                            {
                                RoleId = reader["RoleId"] != DBNull.Value ? Convert.ToInt32(reader["RoleId"]) : roleId,
                                EntityNo = reader["EntityNo"] != DBNull.Value ? Convert.ToInt32(reader["EntityNo"]) : entityNo,
                                View = reader["View"] != DBNull.Value && Convert.ToBoolean(reader["View"]),
                                Create = reader["Create"] != DBNull.Value && Convert.ToBoolean(reader["Create"]),
                                Edit = reader["Edit"] != DBNull.Value && Convert.ToBoolean(reader["Edit"]),
                                Delete = reader["Delete"] != DBNull.Value && Convert.ToBoolean(reader["Delete"]),
                                ActiveInActive = reader["ActiveInActive"] != DBNull.Value && Convert.ToBoolean(reader["ActiveInActive"]),
                                Download = reader["Download"] != DBNull.Value && Convert.ToBoolean(reader["Download"]),
                                Print = reader["Print"] != DBNull.Value && Convert.ToBoolean(reader["Print"])
                            };
                        }
                    }
                }

                return new RolePermissionItem
                {
                    RoleId = roleId,
                    EntityNo = entityNo,
                    View = false,
                    Create = false,
                    Edit = false,
                    Delete = false,
                    ActiveInActive = false,
                    Download = false,
                    Print = false
                };
            }
            catch (SqlException ex)
            {
                throw new Exception("Database error in GetMenuRights: " + ex.Message);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.StackTrace);
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public async Task<FileUploadResult> FileUpload(IFormFile postedFile, string folderName)
        {
            if (postedFile == null || postedFile.Length == 0)
            {
                throw new Exception("Please upload file.");
            }

            int maxContentLength = 1024 * 1024 * 20;
            IList<string> allowedFileExtensions = new List<string>
            {
                ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff", ".webp", ".svg", ".ico",
                ".doc", ".docx", ".pdf", ".txt", ".rtf", ".csv", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".md", ".html", ".htm", ".xml", ".json", ".ps", ".epub",
                ".mp3", ".wav", ".ogg", ".flac", ".aac", ".wma", ".m4a", ".amr", ".mid", ".midi",
                ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".mpeg", ".mpg", ".3gp", ".3g2"
            };

            var ext = Path.GetExtension(postedFile.FileName);
            var fileExtension = ext.ToLower();

            if (!allowedFileExtensions.Contains(fileExtension))
            {
                throw new Exception("Please upload valid file.");
            }

            if (postedFile.Length > maxContentLength)
            {
                throw new Exception("Please upload a file up to 20 MB.");
            }

            var safeFolderName = string.IsNullOrWhiteSpace(folderName) ? "General" : folderName.Trim();
            string timeStamp = DateTime.Now.ToString("yyyyMMddHHmmssfff");
            string uploadPathView = _configuration["AppSettings:FileUploadPathView"] ?? string.Empty;
            string fileName = Path.GetFileName(postedFile.FileName);
            string extension = Path.GetExtension(fileName);
            string uploadPathName = extension.Substring(1).ToUpper() + timeStamp + extension;

            string startupPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "FileUpload", safeFolderName);
            if (!Directory.Exists(startupPath))
            {
                Directory.CreateDirectory(startupPath);
            }

            var filePath = Path.Combine(startupPath, uploadPathName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await postedFile.CopyToAsync(stream);
            }

            var url = safeFolderName + "/" + uploadPathName;

            return new FileUploadResult
            {
                Url = url,
                FileName = uploadPathName,
                FileType = safeFolderName,
                FullPath = uploadPathView + url
            };
        }

        public async Task SendEmail(string toEmail, string? ccEmail, string subject, string body, byte[]? fileBytes = null, string? fileName = null, string? contentType = null)
        {
            try
            {
                var smtpHost = _configuration["AppSettings:SmtpSettings:SmtpHost"];
                var smtpPort = Convert.ToInt32(_configuration["AppSettings:SmtpSettings:SmtpPort"]);
                var smtpUser = _configuration["AppSettings:SmtpSettings:SmtpUser"];
                var smtpPass = _configuration["AppSettings:SmtpSettings:SmtpPass"];
                var fromEmail = _configuration["AppSettings:SmtpSettings:From"];
                var configuredCc = _configuration["AppSettings:SmtpSettings:Cc"];

                if (string.IsNullOrWhiteSpace(toEmail))
                    throw new ArgumentException("Recipient email address is missing.", nameof(toEmail));

                if (string.IsNullOrWhiteSpace(fromEmail))
                    throw new InvalidOperationException("AppSettings:SmtpSettings:From is missing in appsettings.json.");

                if (string.IsNullOrWhiteSpace(smtpHost))
                    throw new InvalidOperationException("AppSettings:SmtpSettings:SmtpHost is missing in appsettings.json.");

                using var message = new MailMessage();
                message.From = new MailAddress(fromEmail);
                message.To.Add(toEmail);

                var mergedCc = string.Join(";",
                    new[] { configuredCc, ccEmail }
                        .Where(x => !string.IsNullOrWhiteSpace(x)));

                if (!string.IsNullOrWhiteSpace(mergedCc))
                {
                    var ccAddresses = mergedCc
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Distinct(StringComparer.OrdinalIgnoreCase);

                    foreach (var address in ccAddresses)
                    {
                        message.CC.Add(address);
                    }
                }

                message.Subject = subject;
                message.Body = body;
                message.IsBodyHtml = true;

                if (fileBytes != null && fileBytes.Length > 0 && !string.IsNullOrWhiteSpace(fileName))
                {
                    var stream = new MemoryStream(fileBytes);
                    var attachment = new Attachment(
                        stream,
                        fileName,
                        string.IsNullOrWhiteSpace(contentType)
                            ? "application/octet-stream"
                            : contentType
                    );

                    message.Attachments.Add(attachment);
                }

                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl = true
                };

                await client.SendMailAsync(message);
            }
            catch (SmtpException ex)
            {
                throw new InvalidOperationException("Unable to send the email because the SMTP server rejected or could not deliver it.", ex);
            }
            catch (Exception ex) when (ex is not ArgumentException && ex is not InvalidOperationException)
            {
                throw new InvalidOperationException("Unable to prepare or send the email.", ex);
            }
        }

       
    }
}
