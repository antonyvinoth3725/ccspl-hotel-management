using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class PackageItemsRepository : IPackageItemsRepository
{
    public List<PackageItems> GetByPackageId(int packageId)
    {
        List<PackageItems> list = new List<PackageItems>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetPackageItemsByPackageId", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", packageId));
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<PackageItems>();
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
    }

    public bool CreatePackageItems(List<PackageItems> items)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                foreach (var item in items)
                {
                    using (cmd = DataFactory.CreateCommand("SP_CreatePackageItems", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", item.PackageId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CategoryId", item.CategoryId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Quantity", item.Quantity));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive ?? true));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted ?? false));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? (object)DBNull.Value));

                        DataFactory.ExecuteNonQuery(cmd);
                    }
                }

                return true;
            }
        }
        catch (SqlException)
        {
            return false;
        }
        catch (Exception ex)
        {
            return false;
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed)
                conn.Close();
        }
    }

    public bool DeletePackageItem(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        bool taskStatus = false;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("DeletePackageItemsById", conn))
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
            if (conn != null && conn.State != ConnectionState.Closed)
                conn.Close();
        }

        return taskStatus;
    }

    #region Private Methods
    private List<PackageItems> List(IDataReader reader)
    {
        var list = new List<PackageItems>();
        try
        {
            while (reader.Read())
            {
                var item = new PackageItems();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"])!;
                if (reader["PackageId"] != DBNull.Value)
                    item.PackageId = Convert.ToInt32(reader["PackageId"])!;
                if (reader["CategoryId"] != DBNull.Value)
                    item.CategoryId = Convert.ToInt32(reader["CategoryId"])!;
                if (reader["Quantity"] != DBNull.Value)
                    item.Quantity = Convert.ToInt32(reader["Quantity"])!;
                if (reader["CreatedBy"] != DBNull.Value)
                    item.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);
                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);
                if (reader["UpdatedBy"] != DBNull.Value)
                    item.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);
                if (reader["UpdatedDate"] != DBNull.Value)
                    item.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);
                if (reader["IsActive"] != DBNull.Value)
                    item.IsActive = Convert.ToBoolean(reader["IsActive"]);
                if (reader["IsDeleted"] != DBNull.Value)
                    item.IsDeleted = Convert.ToBoolean(reader["IsDeleted"]);

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
    #endregion
}
