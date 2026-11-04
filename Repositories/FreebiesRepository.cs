using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class FreebiesRepository : IFreebiesRepository
{
    public List<PopularFreebieMaster> GetAll()
    {
        try
        {
            using IDbConnection conn = DataFactory.CreateConnection();

            conn.Open();

            using IDbCommand cmd = DataFactory.CreateCommand(
                "[dbo].[GetPopularFreebieMaster]",
                conn);

            ((SqlCommand)cmd).CommandType =
                CommandType.StoredProcedure;

            using IDataReader reader =
                DataFactory.ExecuteReader(cmd);

            return List(reader);
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }


    public PopularFreebieMaster? GetById(int id)
    {
        try
        {
            using IDbConnection conn =
                DataFactory.CreateConnection();

            conn.Open();

            using IDbCommand cmd =
                DataFactory.CreateCommand(
                    "[dbo].[SP_GetPopularFreebieMasterById]",
                    conn);

            ((SqlCommand)cmd).CommandType =
                CommandType.StoredProcedure;

            cmd.Parameters.Add(
                DataFactory.CreateParameter(
                    "@Id",
                    id));

            using IDataReader reader =
                DataFactory.ExecuteReader(cmd);

            var list = List(reader);

            return list.FirstOrDefault();
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }


    public int Create(PopularFreebieMaster item)
    {
        Validate(item);

        try
        {
            using IDbConnection conn = DataFactory.CreateConnection();

            conn.Open();

            EnsureNameAvailable( conn,item.Name, 0);

            EnsureDisplayOrderAvailable(conn,item.DisplayOrder, 0);

            using IDbCommand cmd =  DataFactory.CreateCommand(  "[dbo].[SP_CreatePopularFreebieMaster]",conn);

            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

            AddSaveParameters(cmd, item, includeLegacyCreateParameters: true);
            cmd.Parameters.Add( DataFactory.CreateParameter("@CreatedBy", item.CreatedBy ?? (object)DBNull.Value));
            cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedDate",DateTime.Now));
            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? (object)DBNull.Value));
            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedDate", item.UpdatedDate ?? (object)DBNull.Value));

            var result = DataFactory.ExecuteScalar(cmd);

            if (result == null ||
                result == DBNull.Value)
            {
                return 0;
            }

            item.Id = Convert.ToInt32(result);

            return item.Id;
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }


    public bool Update(PopularFreebieMaster item)
    {
        Validate(item);

        if (item.Id <= 0)
            throw new ArgumentException( "Valid Id is required.");

        try
        {
            using IDbConnection conn = DataFactory.CreateConnection();

            conn.Open();

            EnsureNameAvailable( conn,item.Name,  item.Id);

            EnsureDisplayOrderAvailable( conn,item.DisplayOrder,item.Id);

            using IDbCommand cmd = DataFactory.CreateCommand("[dbo].[SP_UpdatePopularFreebieMaster]", conn);

            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add( DataFactory.CreateParameter( "@Id", item.Id));

            AddSaveParameters(cmd, item, includeLegacyCreateParameters: false);

            cmd.Parameters.Add( DataFactory.CreateParameter("@CreatedBy", item.CreatedBy ?? (object)DBNull.Value));
            cmd.Parameters.Add( DataFactory.CreateParameter("@CreatedDate", item.CreatedDate == default? (object)DBNull.Value : item.CreatedDate));
            cmd.Parameters.Add( DataFactory.CreateParameter("@UpdatedBy",item.UpdatedBy ??(object)DBNull.Value));
            cmd.Parameters.Add( DataFactory.CreateParameter("@UpdatedDate", DateTime.Now));

            var result = DataFactory.ExecuteScalar(cmd);

            return result != null && result != DBNull.Value && Convert.ToInt32(result) > 0;
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }


    public bool Delete(int id)
    {
        try
        {
            using IDbConnection conn =DataFactory.CreateConnection();

            conn.Open();

            using IDbCommand cmd = DataFactory.CreateCommand("[dbo].[DeletePopularFreebieMasterById]", conn);

            ((SqlCommand)cmd).CommandType =CommandType.StoredProcedure;

            cmd.Parameters.Add(DataFactory.CreateParameter( "@Id",id));

            var result =DataFactory.ExecuteScalar(cmd);

            return result != null && result != DBNull.Value &&  Convert.ToInt32(result) > 0;
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }


    public bool ActiveInActive(
        int id,
        bool status)
    {
        try
        {
            using IDbConnection conn =DataFactory.CreateConnection();

            conn.Open();

            using IDbCommand cmd = DataFactory.CreateCommand("[dbo].[ActiveInActivePopularFreebieMasterById]", conn);

            ((SqlCommand)cmd).CommandType =CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@Id",id));
            cmd.Parameters.Add( DataFactory.CreateParameter("@IsActive", status));
            var result =DataFactory.ExecuteScalar(cmd);
            return result != null &&result != DBNull.Value && Convert.ToInt32(result) > 0;
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(ex.Message);
        }
    }


    private static void Validate(
        PopularFreebieMaster item)
    {
        if (item == null)
            throw new ArgumentNullException(
                nameof(item));

        if (string.IsNullOrWhiteSpace(
            item.Name))
        {
            throw new ArgumentException(
                "Name is required.");
        }

        if (item.DisplayOrder <= 0)
        {
            throw new ArgumentException(
                "Display Order must be greater than zero.");
        }

        if (item.ValidFrom.HasValue &&
            item.ValidTo.HasValue &&
            item.ValidFrom.Value >
            item.ValidTo.Value)
        {
            throw new ArgumentException(
                "Valid From cannot be greater than Valid To.");
        }
    }


    private static void EnsureNameAvailable(
        IDbConnection conn,
        string name,
        int currentId)
    {
        using IDbCommand cmd =
            DataFactory.CreateCommand(
                @"SELECT COUNT(1)
                      FROM dbo.PopularFreebieMaster
                      WHERE LTRIM(RTRIM(Name)) 
                        =  LTRIM(RTRIM(@Name))

                        AND Id <> @CurrentId

                        AND ISNULL(IsDeleted, 0) = 0",
                conn);

        cmd.Parameters.Add( DataFactory.CreateParameter("@Name", name.Trim()));
        cmd.Parameters.Add( DataFactory.CreateParameter("@CurrentId", currentId));
        int count = Convert.ToInt32(DataFactory.ExecuteScalar(cmd));

        if (count > 0)
        {
            throw new ArgumentException(
                "Name already exists.");
        }
    }


    private static void EnsureDisplayOrderAvailable(
        IDbConnection conn,
        int displayOrder,
        int currentId)
    {
        using IDbCommand cmd =
            DataFactory.CreateCommand(
                @"SELECT COUNT(1)
                      FROM dbo.PopularFreebieMaster
                      WHERE DisplayOrder = @DisplayOrder

                        AND Id <> @CurrentId

                        AND ISNULL(IsDeleted, 0) = 0",
                conn);

        cmd.Parameters.Add(DataFactory.CreateParameter("@DisplayOrder",  displayOrder));
        cmd.Parameters.Add(DataFactory.CreateParameter("@CurrentId",currentId));
        int count =Convert.ToInt32(    DataFactory.ExecuteScalar(cmd));

        if (count > 0)
        {
            throw new ArgumentException(
                "Display Order already exists.");
        }
    }


    private static void AddSaveParameters(
        IDbCommand cmd,
        PopularFreebieMaster item,
        bool includeLegacyCreateParameters)
    {
        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
        cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", item.PackageId ??(object)DBNull.Value));
        cmd.Parameters.Add(DataFactory.CreateParameter("@MinPax", item.MinPax ?? (object)DBNull.Value));             
        cmd.Parameters.Add(DataFactory.CreateParameter("@FreeQty",item.FreeQty ??(object)DBNull.Value));
        cmd.Parameters.Add(DataFactory.CreateParameter("@LocationId",item.LocationId ??(object)DBNull.Value));
        cmd.Parameters.Add(DataFactory.CreateParameter("@DisplayOrder",item.DisplayOrder));
        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive",item.IsActive));
        cmd.Parameters.Add(DataFactory.CreateParameter("@ValidFrom", item.ValidFrom ?? (object)DBNull.Value));
        cmd.Parameters.Add(DataFactory.CreateParameter("@ValidTo",item.ValidTo ?? (object)DBNull.Value));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks",item.Remarks ?? (object)DBNull.Value));
        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
    }


    private List<PopularFreebieMaster> List(
        IDataReader reader)
    {
        var list =  new List<PopularFreebieMaster>();

        try
        {
            while (reader.Read())
            {
                var item = new PopularFreebieMaster();


                if (reader["Id"] != DBNull.Value) item.Id =Convert.ToInt32(reader["Id"]);
                if (reader["Name"] != DBNull.Value) item.Name = Convert.ToString(reader["Name"]) ?? string.Empty;
                if (reader["PackageId"] != DBNull.Value)item.PackageId =Convert.ToInt32( reader["PackageId"]);
                if (reader["MinPax"] != DBNull.Value)item.MinPax =Convert.ToInt32(reader["MinPax"]);
                if (reader["FreeQty"] != DBNull.Value)item.FreeQty =Convert.ToInt32(reader["FreeQty"]);
                if (reader["LocationId"] != DBNull.Value)item.LocationId = Convert.ToInt32( reader["LocationId"]);
                if (reader["DisplayOrder"] != DBNull.Value)item.DisplayOrder =Convert.ToInt32(reader["DisplayOrder"]);
                if (reader["IsActive"] != DBNull.Value) item.IsActive = Convert.ToBoolean(reader["IsActive"]);
                if (reader["ValidFrom"] != DBNull.Value)item.ValidFrom =Convert.ToDateTime( reader["ValidFrom"]);
                if (reader["ValidTo"] != DBNull.Value)item.ValidTo = Convert.ToDateTime(reader["ValidTo"]);
                if (reader["Remarks"] != DBNull.Value)item.Remarks =Convert.ToString(reader["Remarks"]);
                if (reader["IsDeleted"] != DBNull.Value)item.IsDeleted =Convert.ToBoolean(reader["IsDeleted"]);
                if (reader["CreatedBy"] != DBNull.Value) item.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);
                if (reader["CreatedDate"] != DBNull.Value)item.CreatedDate =Convert.ToDateTime(reader["CreatedDate"]);
                if (reader["UpdatedBy"] != DBNull.Value) item.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);
                if (reader["UpdatedDate"] != DBNull.Value)item.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);


                list.Add(item);
            }
        }
        catch (Exception ex)
        {
            throw new Exception(
                "Popular Freebie mapping error: " +
                ex.Message);
        }

        return list;
    }
}

