using System.Data;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories;

public class EventMasterRepository : IEventMasterRepository
{
    public List<EventMaster> GetAll()
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = CreateCommand("GetEventMaster", conn);
        using var reader = DataFactory.ExecuteReader(cmd);
        return ReadList(reader);
    }

    public EventMaster? GetById(int id)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = CreateCommand("SP_GetEventMasterById", conn);
        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
        using var reader = DataFactory.ExecuteReader(cmd);
        var item = ReadList(reader).FirstOrDefault();
        if (item != null && reader.NextResult())
        {
            while (reader.Read())
            {
                item.PackageDetails.Add(new EventDetails
                {
                    Id = reader["Id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Id"]),
                    PackageId = reader["PackageId"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PackageId"]),
                    PackageName = reader["PackageName"] == DBNull.Value ? string.Empty : Convert.ToString(reader["PackageName"]),
                    EventId = reader["EventId"] == DBNull.Value ? id : Convert.ToInt32(reader["EventId"]),
                    IsActive = reader["IsActive"] == DBNull.Value || Convert.ToBoolean(reader["IsActive"]),
                    IsDeleted = reader["IsDeleted"] != DBNull.Value && Convert.ToBoolean(reader["IsDeleted"]),
                    CreatedBy = reader["CreatedBy"] == DBNull.Value ? 0 : Convert.ToInt32(reader["CreatedBy"]),
                    CreatedDate = reader["CreatedDate"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["CreatedDate"]),
                    UpdatedBy = reader["UpdatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["UpdatedBy"]),
                    UpdatedDate = reader["UpdatedDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["UpdatedDate"])
                });
            }
        }
        return item;
    }

    public int Create(EventMaster item)
    {
        try
        {
            using var conn = DataFactory.CreateConnection();
            conn.Open();
            using var cmd = CreateCommand("SP_CreateEventMaster", conn);
            cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
            cmd.Parameters.Add(DataFactory.CreateParameter("@MinPax", item.MinPax));
            cmd.Parameters.Add(DataFactory.CreateParameter("@ServiceCharge", item.ServiceCharge));
            cmd.Parameters.Add(DataFactory.CreateParameter("@AdvanceBookingDays", item.AdvanceBookingDays));
            cmd.Parameters.Add(DataFactory.CreateParameter("@PackageIds", item.PackageIds ?? (object)DBNull.Value));
            cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
            cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy ?? 0));
            cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
            var result = DataFactory.ExecuteScalar(cmd);
            return result == null ? 0 : Convert.ToInt32(result);
        }
        catch (SqlException ex)
        {
            throw new Exception("Unable to create event: " + ex.Message, ex);
        }
    }

    public int Update(EventMaster item)
    {
        try
        {
            using var conn = DataFactory.CreateConnection();
            conn.Open();
            using var cmd = CreateCommand("SP_UpdateEventMaster", conn);
            cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
            cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
            cmd.Parameters.Add(DataFactory.CreateParameter("@MinPax", item.MinPax));
            cmd.Parameters.Add(DataFactory.CreateParameter("@ServiceCharge", item.ServiceCharge));
            cmd.Parameters.Add(DataFactory.CreateParameter("@AdvanceBookingDays", item.AdvanceBookingDays));
            cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? 0));
            cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
            var result = DataFactory.ExecuteScalar(cmd);
            // Some deployed versions of SP_UpdateEventMaster perform the update
            // without selecting @@ROWCOUNT. Reaching this point without a SQL
            // exception means that version completed successfully.
            return result == null || result == DBNull.Value ? 1 : Convert.ToInt32(result);
        }
        catch (SqlException ex)
        {
            throw new Exception("Unable to update event: " + ex.Message, ex);
        }
    }

    public bool Delete(int id) => ExecuteStatus("DeleteEventMasterById", id);

    public bool ActiveInActive(int id, bool status)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = CreateCommand("ActiveInActiveEventMasterById", conn);
        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", status));
        var result = DataFactory.ExecuteScalar(cmd);
        return result != null && Convert.ToInt32(result) > 0;
    }

    private static bool ExecuteStatus(string procedure, int id)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = CreateCommand(procedure, conn);
        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
        var result = DataFactory.ExecuteScalar(cmd);
        return result != null && Convert.ToInt32(result) > 0;
    }

    private static IDbCommand CreateCommand(string procedure, IDbConnection conn)
    {
        var cmd = DataFactory.CreateCommand(procedure, conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        return cmd;
    }

    private static List<EventMaster> ReadList(IDataReader reader)
    {
        var list = new List<EventMaster>();
        while (reader.Read())
        {
            list.Add(new EventMaster
            {
                Id = reader["Id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Id"]),
                Name = reader["Name"] == DBNull.Value ? string.Empty : Convert.ToString(reader["Name"]) ?? string.Empty,
                MinPax = reader["MinPax"] == DBNull.Value ? 0 : Convert.ToInt32(reader["MinPax"]),
                ServiceCharge = GetOptionalDecimal(reader, "ServiceCharge"),
                AdvanceBookingDays = reader["AdvanceBookingDays"] == DBNull.Value ? 0 : Convert.ToInt32(reader["AdvanceBookingDays"]),
                IsDeleted = reader["IsDeleted"] != DBNull.Value && Convert.ToBoolean(reader["IsDeleted"]),
                IsActive = reader["IsActive"] != DBNull.Value && Convert.ToBoolean(reader["IsActive"]),
                CreatedBy = reader["CreatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["CreatedBy"]),
                CreatedDate = reader["CreatedDate"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["CreatedDate"]),
                UpdatedBy = reader["UpdatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["UpdatedBy"]),
                UpdatedDate = reader["UpdatedDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["UpdatedDate"])
            });
        }
        return list;
    }

    private static decimal GetOptionalDecimal(IDataRecord record, string columnName)
    {
        try
        {
            var ordinal = record.GetOrdinal(columnName);
            return record.IsDBNull(ordinal) ? 0 : Convert.ToDecimal(record.GetValue(ordinal));
        }
        catch (IndexOutOfRangeException)
        {
            return 0;
        }
    }
}
