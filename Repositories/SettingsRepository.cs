using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System;
using System.Data;

namespace GayatriCateringPortal.Repositories;

public class SettingsRepository : ISettingsRepository
{
    public List<Organization> GetAll()
    {
        var list = new List<Organization>();
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetOrganization", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }
            return list ?? new List<Organization>();
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

    public int Create(Organization item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateOrganization", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));    
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UEN", (object?)item.UEN ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Address", (object?)item.Address ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Email", (object?)item.Email ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Hotline", (object?)item.Hotline ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@whatsapp", (object?)item.Whatsapp ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@QuotationValidity", item.QuotationValidity));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@GSTRate", item.GSTRate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PortalMode", item.PortalMode));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@GSTNO", (object?)item.GSTNO ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedDate",item.CreatedDate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UPIId", (object?)item.UPIId ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PaymentGatwayDetails", (object?)item.PaymentGatwayDetails ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpcomingGSTRate", item.UpcomingGSTRate.HasValue ? item.UpcomingGSTRate.Value : (object?)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@GSTEffectiveFrom", item.GSTEffectiveFrom.HasValue ? item.GSTEffectiveFrom.Value : (object?)DBNull.Value));
                    AddVarBinaryParameter((SqlCommand)cmd, "@AuthoriseSignature", ConvertSignatureToBytes(item.AuthoriseSignature));


                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        return Convert.ToInt32(result);
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
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
        return 0;
    }

    public int Update(Organization item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdateOrganization", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UEN", (object?)item.UEN ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Address", (object?)item.Address ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Email", (object?)item.Email ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Hotline", (object?)item.Hotline ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@whatsapp", (object?)item.Whatsapp ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@QuotationValidity", item.QuotationValidity));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@GSTRate", item.GSTRate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PortalMode", item.PortalMode));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@GSTNO", (object?)item.GSTNO ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedDate", item.UpdatedDate ));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UPIId", (object?)item.UPIId ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PaymentGatwayDetails", (object?)item.PaymentGatwayDetails ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpcomingGSTRate", item.UpcomingGSTRate.HasValue ? item.UpcomingGSTRate.Value : (object?)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@GSTEffectiveFrom", item.GSTEffectiveFrom.HasValue ? item.GSTEffectiveFrom.Value : (object?)DBNull.Value));
                    AddVarBinaryParameter((SqlCommand)cmd, "@AuthoriseSignature", ConvertSignatureToBytes(item.AuthoriseSignature));


                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        int status = Convert.ToInt32(result);
                        return status;
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
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
        return 0;
    }

    #region Private Methods
    private List<Organization> List(IDataReader reader)
    {
        var list = new List<Organization>();
        try
        {
            while (reader.Read())
            {
                var item = new Organization();

                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"])!;

                if (reader["Name"] != DBNull.Value)
                    item.Name = Convert.ToString(reader["Name"])!;

                if (reader["UEN"] != DBNull.Value)
                    item.UEN = Convert.ToString(reader["UEN"])!;

                if (reader["Address"] != DBNull.Value)
                    item.Address = Convert.ToString(reader["Address"]);

                if (reader["Email"] != DBNull.Value)
                    item.Email = Convert.ToString(reader["Email"]);

                if (reader["Hotline"] != DBNull.Value)
                    item.Hotline = Convert.ToString(reader["Hotline"]);

                if (reader["Whatsapp"] != DBNull.Value)
                    item.Whatsapp = Convert.ToString(reader["Whatsapp"]);


                if (reader["QuotationValidity"] != DBNull.Value)
                    item.QuotationValidity = Convert.ToInt32(reader["QuotationValidity"]);

                if (reader["GSTRate"] != DBNull.Value)
                    item.GSTRate = Convert.ToDecimal(reader["GSTRate"]);

                if (reader["UpcomingGSTRate"] != DBNull.Value)
                    item.UpcomingGSTRate = Convert.ToDecimal(reader["UpcomingGSTRate"]);

                if (reader["GSTEffectiveFrom"] != DBNull.Value)
                    item.GSTEffectiveFrom = Convert.ToDateTime(reader["GSTEffectiveFrom"]);

                if (reader["PortalMode"] != DBNull.Value)
                    item.PortalMode = Convert.ToString(reader["PortalMode"]);

                if (reader["IsActive"] != DBNull.Value)
                    item.IsActive = Convert.ToBoolean(reader["IsActive"]);

                if (reader["IsDeleted"] != DBNull.Value)
                    item.IsDeleted = Convert.ToBoolean(reader["IsDeleted"]);

                if (reader["CreatedBy"] != DBNull.Value)
                    item.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);

                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);

                if (reader["UpdatedBy"] != DBNull.Value)
                    item.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);

                if (reader["UpdatedDate"] != DBNull.Value)
                    item.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);


                if (reader["UPIId"] != DBNull.Value)
                    item.UPIId = Convert.ToString(reader["UPIId"]);

                if (reader["PaymentGatwayDetails"] != DBNull.Value)
                    item.PaymentGatwayDetails = Convert.ToString(reader["PaymentGatwayDetails"]);

                if (reader["AuthoriseSignature"] != DBNull.Value)
                {
                    var signatureBytes = (byte[])reader["AuthoriseSignature"];
                    item.AuthoriseSignature = signatureBytes.Length > 0
                        ? "data:image/png;base64," + Convert.ToBase64String(signatureBytes)
                        : null;
                }

                list.Add(item);
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

        return list;
    }

    private static byte[]? ConvertSignatureToBytes(string? signatureDataUrl)
    {
        if (string.IsNullOrWhiteSpace(signatureDataUrl))
        {
            return null;
        }

        const string prefix = "data:image/png;base64,";
        if (!signatureDataUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("The authorise signature must be a PNG image.");
        }

        try
        {
            return Convert.FromBase64String(signatureDataUrl[prefix.Length..]);
        }
        catch (FormatException ex)
        {
            throw new ArgumentException("The authorise signature image is invalid.", ex);
        }
    }

    private static void AddVarBinaryParameter(SqlCommand command, string name, byte[]? value)
    {
        var parameter = command.Parameters.Add(name, SqlDbType.VarBinary, -1);
        parameter.Value = value == null || value.Length == 0 ? DBNull.Value : value;
    }
    #endregion
}
