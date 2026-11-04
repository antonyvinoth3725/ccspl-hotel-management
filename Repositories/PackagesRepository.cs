using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class PackagesRepository : IPackagesRepository
{
    public List<Packages> GetAll()
    {
        var list = new List<Packages>();
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetPackages", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    while (reader.Read())
                    {
                        list.Add(new Packages
                        {
                            Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                            Name = reader["Name"] != DBNull.Value ? Convert.ToString(reader["Name"]) ?? string.Empty : string.Empty,
                            Description = reader["Description"] != DBNull.Value ? Convert.ToString(reader["Description"]) : null,
                            Price = reader["Price"] != DBNull.Value ? Convert.ToDecimal(reader["Price"]) : 0,
                            IsActive = reader["IsActive"] != DBNull.Value && Convert.ToBoolean(reader["IsActive"]),
                            CreatedBy = reader["CreatedBy"] != DBNull.Value ? Convert.ToInt32(reader["CreatedBy"]) : 0,
                            CreatedDate = reader["CreatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedDate"]) : DateTime.MinValue,
                            UpdatedBy = reader["UpdatedBy"] != DBNull.Value ? Convert.ToInt32(reader["UpdatedBy"]) : null,
                            UpdatedDate = reader["UpdatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["UpdatedDate"]) : null,
                            IsDeleted = reader["IsDeleted"] != DBNull.Value && Convert.ToBoolean(reader["IsDeleted"]),
                            IsEmpty = reader["IsEmpty"] != DBNull.Value && Convert.ToBoolean(reader["IsEmpty"])
                        });
                    }
                }
            }
            return list;
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error: " + ex.Message, ex);
        }
        catch (Exception ex)
        {
            throw new Exception("Unable to load packages: " + ex.Message, ex);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public Packages? GetById(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetPackagesById", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    reader = DataFactory.ExecuteReader(cmd);
                    if (reader.Read())
                    {
                        var package = new Packages
                        {
                            Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                            Name = reader["Name"] != DBNull.Value ? Convert.ToString(reader["Name"]) ?? string.Empty : string.Empty,
                            Description = reader["Description"] != DBNull.Value ? Convert.ToString(reader["Description"]) : null,
                            Price = reader["Price"] != DBNull.Value ? Convert.ToDecimal(reader["Price"]) : 0,
                            IsActive = reader["IsActive"] != DBNull.Value && Convert.ToBoolean(reader["IsActive"]),
                            CreatedBy = reader["CreatedBy"] != DBNull.Value ? Convert.ToInt32(reader["CreatedBy"]) : 0,
                            CreatedDate = reader["CreatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedDate"]) : DateTime.MinValue,
                            UpdatedBy = reader["UpdatedBy"] != DBNull.Value ? Convert.ToInt32(reader["UpdatedBy"]) : null,
                            UpdatedDate = reader["UpdatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["UpdatedDate"]) : null,
                            IsDeleted = reader["IsDeleted"] != DBNull.Value && Convert.ToBoolean(reader["IsDeleted"]),
                            IsEmpty = reader["IsEmpty"] != DBNull.Value && Convert.ToBoolean(reader["IsEmpty"])
                        };

                        return package;
                    }
                }
            }
            return null;
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

    public int Create(Packages item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreatePackages", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Description", item.Description ?? string.Empty));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Price", item.Price));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsEmpty", item.IsEmpty));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        int id = Convert.ToInt32(result);
                        return id;  // Returns -1 if already exists, or the new ID if created
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
        

    public int Update(Packages item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdatePackages", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Description", item.Description ?? string.Empty));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Price", item.Price));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsEmpty", item.IsEmpty));

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
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("DeletePackagesById", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
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

    public bool ActiveInActive(int id, bool status)
    {

        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("ActiveInActivePackagesById", conn))
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
}

