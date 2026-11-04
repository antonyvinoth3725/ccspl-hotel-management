using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;

namespace GayatriCateringPortal.Repositories;

public class CustomerRepository : ICustomerRepository
{
    public List<CustomerMaster> GetAll()
    {
        List<CustomerMaster> list = new List<CustomerMaster>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("[dbo].[SP_GetCustomerMaster]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<CustomerMaster>();
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

    public CustomerMaster? GetById(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;
        CustomerMaster? item = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("[dbo].[SP_GetCustomerMasterById]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    reader = DataFactory.ExecuteReader(cmd);
                    var list = this.List(reader);
                    if (list != null && list.Count > 0) item = list[0];
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

        return item;
    }

    public int Create(CustomerMaster customer)
    {
        try
        {
            using (IDbConnection conn = DataFactory.CreateConnection())
            {
                conn.Open();

                EnsureEmailAndMobileAvailable(conn, customer.EmailId, customer.MobileNo, 0);

                using (IDbCommand cmd = DataFactory.CreateCommand("[dbo].[SP_CreateCustomerMaster]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", customer.Code ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", customer.Name ?? (object)DBNull.Value));

                    cmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", customer.MobileNo ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EmailId", customer.EmailId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Address", customer.Address ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Pincode", customer.Pincode ?? (object)DBNull.Value));

                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", customer.Remarks ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", customer.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", customer.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", customer.CreatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedDate", DateTime.Now));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", customer.EntityNo));

                    var result = DataFactory.ExecuteScalar(cmd);

                    if (result != null && result != DBNull.Value)
                    {
                        customer.Id = Convert.ToInt32(result);
                        return customer.Id;
                    }
                }
            }
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }

        return 0;
    }

    public bool Update(CustomerMaster customer)
    {
        try
        {
            using (IDbConnection conn = DataFactory.CreateConnection())
            {
                conn.Open();

                EnsureEmailAndMobileAvailable(conn, customer.EmailId, customer.MobileNo, customer.Id);

                using (IDbCommand cmd = DataFactory.CreateCommand("[dbo].[SP_UpdateCustomerMaster]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", customer.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", customer.Code ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", customer.Name ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", customer.MobileNo ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EmailId", customer.EmailId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Address", customer.Address ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Pincode", customer.Pincode ?? (object)DBNull.Value));

                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", customer.Remarks ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", customer.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", customer.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", customer.UpdatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedDate", DateTime.Now));

                    var result = DataFactory.ExecuteScalar(cmd);

                    return result != null && result != DBNull.Value && Convert.ToInt32(result) > 0;
                }
            }
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }

    private static void EnsureEmailAndMobileAvailable(
        IDbConnection conn,
        string? emailId,
        string? mobileNo,
        int currentId)
    {
        if (!string.IsNullOrWhiteSpace(emailId))
        {
            using IDbCommand emailCmd = DataFactory.CreateCommand(
                @"SELECT COUNT(1)
                  FROM dbo.CustomerMaster
                  WHERE LTRIM(RTRIM(EmailId)) = LTRIM(RTRIM(@EmailId))
                    AND Id <> @CurrentId
                    AND ISNULL(IsDeleted, 0) = 0",
                conn);

            emailCmd.Parameters.Add(DataFactory.CreateParameter("@EmailId", emailId.Trim()));
            emailCmd.Parameters.Add(DataFactory.CreateParameter("@CurrentId", currentId));

            if (Convert.ToInt32(DataFactory.ExecuteScalar(emailCmd)) > 0)
                throw new ArgumentException("Email ID already exists.");
        }

        if (!string.IsNullOrWhiteSpace(mobileNo))
        {
            using IDbCommand mobileCmd = DataFactory.CreateCommand(
                @"SELECT COUNT(1)
                  FROM dbo.CustomerMaster
                  WHERE LTRIM(RTRIM(MobileNo)) = LTRIM(RTRIM(@MobileNo))
                    AND Id <> @CurrentId
                    AND ISNULL(IsDeleted, 0) = 0",
                conn);

            mobileCmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", mobileNo.Trim()));
            mobileCmd.Parameters.Add(DataFactory.CreateParameter("@CurrentId", currentId));

            if (Convert.ToInt32(DataFactory.ExecuteScalar(mobileCmd)) > 0)
                throw new ArgumentException("Mobile Number already exists.");
        }
    }


    public bool Delete(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        bool taskStatus = false;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("[dbo].[DeleteCustomerMasterById]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    var r = DataFactory.ExecuteScalar(cmd);
                    if (r != null && Convert.ToInt32(r) > 0)
                        taskStatus = true;
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

        return taskStatus;
    }

    public bool ActiveInActive(int id, bool status)
    {

        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("[dbo].[ActiveInActiveCustomerMasterById]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", status));
                    var r = DataFactory.ExecuteScalar(cmd);
                    return r != null && Convert.ToInt32(r) > 0;
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
    }

    //common
    private List<CustomerMaster> List(IDataReader reader)
    {
        var list = new List<CustomerMaster>();

        try
        {
            while (reader.Read())
            {
                var customer = new CustomerMaster();

                if (reader["Id"] != DBNull.Value)customer.Id = Convert.ToInt32(reader["Id"]);

                if (reader["Code"] != DBNull.Value)  customer.Code = Convert.ToString(reader["Code"]);

                if (reader["Name"] != DBNull.Value)  customer.Name = Convert.ToString(reader["Name"]);

                if (reader["MobileNo"] != DBNull.Value)customer.MobileNo = Convert.ToString(reader["MobileNo"]);

                if (reader["EmailId"] != DBNull.Value)customer.EmailId = Convert.ToString(reader["EmailId"]);

                if (HasColumn(reader, "Address") && reader["Address"] != DBNull.Value) customer.Address = Convert.ToString(reader["Address"]);

                if (reader["Pincode"] != DBNull.Value) customer.Pincode = Convert.ToString(reader["Pincode"]);

                if (reader["Remarks"] != DBNull.Value) customer.Remarks = Convert.ToString(reader["Remarks"]);

                if (reader["IsActive"] != DBNull.Value)  customer.IsActive = Convert.ToBoolean(reader["IsActive"]);

                if (reader["IsDeleted"] != DBNull.Value) customer.IsDeleted = Convert.ToBoolean(reader["IsDeleted"]);

                if (reader["CreatedBy"] != DBNull.Value) customer.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);

                if (reader["CreatedDate"] != DBNull.Value)customer.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);

                if (reader["UpdatedBy"] != DBNull.Value)  customer.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);

                if (reader["UpdatedDate"] != DBNull.Value)customer.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);

                list.Add(customer);
            }
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception("Customer mapping error: " + ex.Message);
        }

        return list;
    }

    private static bool HasColumn(IDataReader reader, string columnName)
    {
        try
        {
            return reader.GetOrdinal(columnName) >= 0;
        }
        catch (IndexOutOfRangeException)
        {
            return false;
        }
    }


   



}

