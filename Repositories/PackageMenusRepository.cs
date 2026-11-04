using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class PackageMenusRepository : IPackageMenusRepository
{
    public List<PackageMenus> GetByPackageId(int packageId)
    {
        List<PackageMenus> list = new List<PackageMenus>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetPackageMenusByPackageId", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", packageId));
                    reader = DataFactory.ExecuteReader(cmd);
                    list = List(reader);
                }
            }

            return list ?? new List<PackageMenus>();
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

    public bool CreatePackageMenus(List<PackageMenus> items)
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
                    using (cmd = DataFactory.CreateCommand("SP_CreatePackageMenus", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", item.PackageId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@FoodMenuId", item.FoodMenuId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive ?? true));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted ?? false));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? (object)DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ChoiceGroupName", string.IsNullOrWhiteSpace(item.ChoiceGroupName) ? DBNull.Value : item.ChoiceGroupName.Trim()));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@DisplayOrder", item.DisplayOrder));

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
        catch (Exception)
        {
            return false;
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed)
                conn.Close();
        }
    }

    public bool DeletePackageMenu(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        bool taskStatus = false;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("DeletePackageMenusById", conn))
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
    private List<PackageMenus> List(IDataReader reader)
    {
        var list = new List<PackageMenus>();
        try
        {
            while (reader.Read())
            {
                var item = new PackageMenus();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"]);
                if (reader["PackageId"] != DBNull.Value)
                    item.PackageId = Convert.ToInt32(reader["PackageId"]);
                if (reader["FoodMenuId"] != DBNull.Value)
                    item.FoodMenuId = Convert.ToInt32(reader["FoodMenuId"]);
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
                if (reader["FoodMenuName"] != DBNull.Value)
                    item.FoodMenuName = Convert.ToString(reader["FoodMenuName"]);
                if (reader["FoodMenuPrice"] != DBNull.Value)
                    item.FoodMenuPrice = Convert.ToDecimal(reader["FoodMenuPrice"]);
                if (reader["CategoryId"] != DBNull.Value)
                    item.CategoryId = Convert.ToInt32(reader["CategoryId"]);
                if (reader["CategoryName"] != DBNull.Value)
                    item.CategoryName = Convert.ToString(reader["CategoryName"]);
                if (HasColumn(reader, "ChoiceGroupName") && reader["ChoiceGroupName"] != DBNull.Value)
                    item.ChoiceGroupName = Convert.ToString(reader["ChoiceGroupName"]);
                if (HasColumn(reader, "DisplayOrder") && reader["DisplayOrder"] != DBNull.Value)
                    item.DisplayOrder = Convert.ToInt32(reader["DisplayOrder"]);

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

    private static bool HasColumn(IDataRecord reader, string columnName)
    {
        for (var index = 0; index < reader.FieldCount; index++)
        {
            if (string.Equals(reader.GetName(index), columnName, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
    #endregion
}
