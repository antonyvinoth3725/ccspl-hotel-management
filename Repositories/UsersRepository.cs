using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class UsersRepository : IUsersRepository
{
    public List<UserMaster> GetAll()
    {
        List<UserMaster> list = new List<UserMaster>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetUserMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<UserMaster>();
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

    public UserMaster? GetById(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;
        UserMaster? item = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetUserMasterById", conn))
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

    public int Create(UserMaster item)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateUserMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", item.Code));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Email", item.Email));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ContactNo", item.ContactNo ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", item.Remarks ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsAdmin", item.IsAdmin));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Image", item.Image ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Gender", item.Gender ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Address", item.Address ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PostalCode", item.PostalCode ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));


                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        return Convert.ToInt32(result);  // Returns -1 if duplicate, > 0 if success, 0 if error
                    }
                }
            }
        }
        catch (SqlException)
        {
            return 0;  // Return 0 on database error
        }
        catch (Exception ex)
        {
            return 0;  // Return 0 on any other error
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }

        return 0;
    }

    public int Update(UserMaster item)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdateUserMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", item.Code));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Email", item.Email));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ContactNo", item.ContactNo ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", item.Remarks ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsAdmin", item.IsAdmin));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Image", item.Image ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Gender", item.Gender ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Address", item.Address ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PostalCode", item.PostalCode ?? (object)DBNull.Value));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        int status = Convert.ToInt32(result);
                        return status;  // Returns -1 if duplicate, > 0 if success, 0 if error
                    }
                }
            }
        }
        catch (SqlException)
        {
            return 0;  // Return 0 on database error
        }
        catch (Exception ex)
        {
            return 0;  // Return 0 on any other error
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
        return 0;
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
                using (cmd = DataFactory.CreateCommand("DeleteUserMasterById", conn))
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
                using (cmd = DataFactory.CreateCommand("ActiveInActiveUserMasterById", conn))
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

    #region Private Methods
    private List<UserMaster> List(IDataReader reader)
    {
        var list = new List<UserMaster>();
        try
        {
            while (reader.Read())
            {
                var item = new UserMaster();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"])!;
                if (reader["Code"] != DBNull.Value)
                    item.Code = Convert.ToString(reader["Code"])!;
                if (reader["Name"] != DBNull.Value)
                    item.Name = Convert.ToString(reader["Name"])!;
                if (reader["Email"] != DBNull.Value)
                    item.Email = Convert.ToString(reader["Email"])!;
                if (reader["ContactNo"] != DBNull.Value)
                    item.ContactNo = Convert.ToString(reader["ContactNo"]);
                if (reader["Remarks"] != DBNull.Value)
                    item.Remarks = Convert.ToString(reader["Remarks"]);
                if (reader["IsAdmin"] != DBNull.Value)
                    item.IsAdmin = Convert.ToBoolean(reader["IsAdmin"]);
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
                if (reader["Image"] != DBNull.Value)
                    item.Image = Convert.ToString(reader["Image"]);
                if (reader["Gender"] != DBNull.Value)
                    item.Gender = Convert.ToInt32(reader["Gender"]);
                if (HasColumn(reader, "Address") && reader["Address"] != DBNull.Value)
                    item.Address = Convert.ToString(reader["Address"]);
                if (reader["PostalCode"] != DBNull.Value)
                    item.PostalCode = Convert.ToInt32(reader["PostalCode"]);

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
    #endregion
}
