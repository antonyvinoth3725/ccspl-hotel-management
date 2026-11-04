using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;

namespace GayatriCateringPortal.Repositories;

public class LocationRepository :ILocationsRepository
{
    public List<LocationMaster> GetAll()
    {
        List<LocationMaster> list = new List<LocationMaster>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                using (cmd = DataFactory.CreateCommand(
                    "[dbo].[GetLocationMaster]", conn))
                {
                    ((SqlCommand)cmd).CommandType =
                        CommandType.StoredProcedure;

                    reader = DataFactory.ExecuteReader(cmd);

                    list = this.List(reader);
                }
            }

            return list ?? new List<LocationMaster>();
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
        finally
        {
            if (conn != null &&
                conn.State != ConnectionState.Closed)
            {
                conn.Close();
            }
        }
    }


    public LocationMaster? GetById(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        LocationMaster? item = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed)
                    conn.Open();

                using (cmd = DataFactory.CreateCommand(
                    "[dbo].[SP_GetLocationMasterById]", conn))
                {
                    ((SqlCommand)cmd).CommandType =
                        CommandType.StoredProcedure;

                    cmd.Parameters.Add(
                        DataFactory.CreateParameter("@Id", id));

                    reader = DataFactory.ExecuteReader(cmd);

                    var list = this.List(reader);

                    if (list != null && list.Count > 0)
                    {
                        item = list[0];
                    }
                }
            }
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
        finally
        {
            if (conn != null &&
                conn.State != ConnectionState.Closed)
            {
                conn.Close();
            }
        }

        return item;
    }


    public int Create(LocationMaster location)
    {
        //if (string.IsNullOrWhiteSpace(location.LocationName))
        //    throw new ArgumentException("Location Name is required.");

        try
        {
            using (IDbConnection conn =
                DataFactory.CreateConnection())
            {
                conn.Open();

                EnsureLocationNameAvailable(conn, location.LocationName, 0);

                using (IDbCommand cmd = DataFactory.CreateCommand("[dbo].[SP_CreateLocationMaster]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code",location.Code ??(object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@LocationName", location.LocationName));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DeliveryZone", string.IsNullOrWhiteSpace(location.DeliveryZone) ? DBNull.Value : location.DeliveryZone.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DeliveryFee", location.DeliveryFee));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive",location.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks",location.Remarks ?? (object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted",location.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy",location.CreatedBy ??(object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedDate",DateTime.Now));

                    var result = DataFactory.ExecuteScalar(cmd);


                    if (result != null &&
                        result != DBNull.Value)
                    {
                        location.Id =
                            Convert.ToInt32(result);

                        return location.Id;
                    }
                }
            }
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

        return 0;
    }


    public bool Update(LocationMaster location)
    {
        if (string.IsNullOrWhiteSpace(location.LocationName))
            throw new ArgumentException("Location Name is required.");

        try
        {
            using (IDbConnection conn =
                DataFactory.CreateConnection())
            {
                conn.Open();

                EnsureLocationNameAvailable(conn, location.LocationName, location.Id);

                using (IDbCommand cmd =
                    DataFactory.CreateCommand( "[dbo].[SP_UpdateLocationMaster]",        conn))
                {
                    ((SqlCommand)cmd).CommandType =  CommandType.StoredProcedure;


                    cmd.Parameters.Add(DataFactory.CreateParameter(    "@Id",  location.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code",location.Code ?? (object)DBNull.Value));
                    cmd.Parameters.Add( DataFactory.CreateParameter("@LocationName", location.LocationName));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DeliveryZone", string.IsNullOrWhiteSpace(location.DeliveryZone) ? DBNull.Value : location.DeliveryZone.Trim()));
                    cmd.Parameters.Add( DataFactory.CreateParameter("@DeliveryFee",location.DeliveryFee));
                    cmd.Parameters.Add( DataFactory.CreateParameter("@IsActive",  location.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", location.Remarks ??(object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted",location.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy",location.UpdatedBy ??(object)DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedDate", DateTime.Now));


                    var result = DataFactory.ExecuteScalar(cmd);


                    return result != null &&
                           result != DBNull.Value &&
                           Convert.ToInt32(result) > 0;
                }
            }
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


    private static void EnsureLocationNameAvailable(
    IDbConnection conn,
    string locationName,
    int currentId = 0)
    {
        if (string.IsNullOrWhiteSpace(locationName))
            throw new ArgumentException("Location Name is required.");

        using (IDbCommand cmd = DataFactory.CreateCommand(
            @"SELECT COUNT(1)
          FROM dbo.LocationMaster
          WHERE LTRIM(RTRIM(LocationName)) = LTRIM(RTRIM(@LocationName))
            AND (@CurrentId = 0 OR Id <> @CurrentId)
            AND ISNULL(IsDeleted, 0) = 0",
            conn))
        {
            cmd.Parameters.Add(
                DataFactory.CreateParameter("@LocationName", locationName.Trim()));

            cmd.Parameters.Add(
                DataFactory.CreateParameter("@CurrentId", currentId));

            int count = Convert.ToInt32(DataFactory.ExecuteScalar(cmd));

            if (count > 0)
                throw new ArgumentException("Location Name already exists.");
        }
    }


    public bool Delete(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        bool taskStatus = false;

        try
        {
            using (conn =
                DataFactory.CreateConnection())
            {
                if (conn.State ==
                    ConnectionState.Closed)
                {
                    conn.Open();
                }


                using (cmd =
                    DataFactory.CreateCommand(
                        "[dbo].[DeleteLocationMasterById]",
                        conn))
                {
                    ((SqlCommand)cmd).CommandType =
                        CommandType.StoredProcedure;


                    cmd.Parameters.Add(
                        DataFactory.CreateParameter(
                            "@Id",
                            id));


                    var result =
                        DataFactory.ExecuteScalar(cmd);


                    if (result != null &&
                        result != DBNull.Value &&
                        Convert.ToInt32(result) > 0)
                    {
                        taskStatus = true;
                    }
                }
            }
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
        finally
        {
            if (conn != null &&
                conn.State != ConnectionState.Closed)
            {
                conn.Close();
            }
        }

        return taskStatus;
    }


    public bool ActiveInActive(
        int id,
        bool status)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn =
                DataFactory.CreateConnection())
            {
                if (conn.State ==
                    ConnectionState.Closed)
                {
                    conn.Open();
                }


                using (cmd =
                    DataFactory.CreateCommand(
                        "[dbo].[ActiveInActiveLocationMasterById]",
                        conn))
                {
                    ((SqlCommand)cmd).CommandType =
                        CommandType.StoredProcedure;


                    cmd.Parameters.Add(
                        DataFactory.CreateParameter(
                            "@Id",
                            id));


                    cmd.Parameters.Add(
                        DataFactory.CreateParameter(
                            "@IsActive",
                            status));


                    var result =
                        DataFactory.ExecuteScalar(cmd);


                    return result != null &&
                           result != DBNull.Value &&
                           Convert.ToInt32(result) > 0;
                }
            }
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
        finally
        {
            if (conn != null &&
                conn.State != ConnectionState.Closed)
            {
                conn.Close();
            }
        }
    }


    // COMMON DATA READER MAPPING
    private List<LocationMaster> List(
        IDataReader reader)
    {
        var list =
            new List<LocationMaster>();

        try
        {
            while (reader.Read())
            {
                var location =
                    new LocationMaster();


                if (reader["Id"] != DBNull.Value)
                    location.Id =
                        Convert.ToInt32(
                            reader["Id"]);


                if (reader["Code"] != DBNull.Value)
                    location.Code =
                        Convert.ToString(
                            reader["Code"]);


                if (reader["LocationName"] != DBNull.Value)
                    location.LocationName =
                        Convert.ToString(
                            reader["LocationName"]) ?? string.Empty;

                if (reader["DeliveryZone"] != DBNull.Value)
                    location.DeliveryZone = Convert.ToString(reader["DeliveryZone"]);


                if (reader["DeliveryFee"] != DBNull.Value)
                    location.DeliveryFee =
                        Convert.ToDecimal(
                            reader["DeliveryFee"]);


                if (reader["IsActive"] != DBNull.Value)
                    location.IsActive =
                        Convert.ToBoolean(
                            reader["IsActive"]);


                if (reader["Remarks"] != DBNull.Value)
                    location.Remarks =
                        Convert.ToString(
                            reader["Remarks"]);


                if (reader["IsDeleted"] != DBNull.Value)
                    location.IsDeleted =
                        Convert.ToBoolean(
                            reader["IsDeleted"]);


                if (reader["CreatedBy"] != DBNull.Value)
                    location.CreatedBy =
                        Convert.ToInt32(
                            reader["CreatedBy"]);


                if (reader["CreatedDate"] != DBNull.Value)
                    location.CreatedDate =
                        Convert.ToDateTime(
                            reader["CreatedDate"]);


                if (reader["UpdatedBy"] != DBNull.Value)
                    location.UpdatedBy =
                        Convert.ToInt32(
                            reader["UpdatedBy"]);


                if (reader["UpdatedDate"] != DBNull.Value)
                    location.UpdatedDate =
                        Convert.ToDateTime(
                            reader["UpdatedDate"]);


                list.Add(location);
            }
        }
        catch (SqlException ex)
        {
            throw new Exception(
                "Database error: " + ex.Message);
        }
        catch (Exception ex)
        {
            throw new Exception(
                "Location mapping error: " +
                ex.Message);
        }

        return list;
    }
}
