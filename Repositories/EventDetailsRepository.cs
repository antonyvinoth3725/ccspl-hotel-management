using System.Data;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories;

public class EventDetailsRepository : IEventDetailsRepository
{
    public List<EventDetails> GetByEventId(int eventId)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = CreateCommand("SP_GetEventDetailsByEventId", conn);
        cmd.Parameters.Add(DataFactory.CreateParameter("@EventId", eventId));
        using var reader = DataFactory.ExecuteReader(cmd);
        var list = new List<EventDetails>();
        while (reader.Read())
        {
            var isDeleted = reader["IsDeleted"] != DBNull.Value && Convert.ToBoolean(reader["IsDeleted"]);
            if (isDeleted) continue;

            list.Add(new EventDetails
            {
                Id = reader["Id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Id"]),
                PackageId = reader["PackageId"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PackageId"]),
                EventId = reader["EventId"] == DBNull.Value ? eventId : Convert.ToInt32(reader["EventId"]),
                CreatedBy = reader["CreatedBy"] == DBNull.Value ? 0 : Convert.ToInt32(reader["CreatedBy"]),
                CreatedDate = reader["CreatedDate"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["CreatedDate"]),
                UpdatedBy = reader["UpdatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["UpdatedBy"]),
                UpdatedDate = reader["UpdatedDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["UpdatedDate"]),
                IsActive = reader["IsActive"] == DBNull.Value || Convert.ToBoolean(reader["IsActive"]),
                IsDeleted = false
            });
        }
        return list;
    }

    public bool Save(List<EventDetails> items)
    {
        try
        {
            using var conn = DataFactory.CreateConnection();
            conn.Open();
            foreach (var item in items)
            {
                using var cmd = CreateCommand("SP_CreateEventDetails", conn);
                cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", item.PackageId));
                cmd.Parameters.Add(DataFactory.CreateParameter("@EventId", item.EventId));
                cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? (object)DBNull.Value));
                DataFactory.ExecuteNonQuery(cmd);
            }
            return true;
        }
        catch (SqlException) { return false; }
    }

    public bool Update(EventDetails item)
    {
        try
        {
            using var conn = DataFactory.CreateConnection();
            conn.Open();
            using var cmd = CreateCommand("SP_UpdateEventDetails", conn);
            cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
            cmd.Parameters.Add(DataFactory.CreateParameter("@PackageId", item.PackageId));
            cmd.Parameters.Add(DataFactory.CreateParameter("@EventId", item.EventId));
            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy ?? 0));
            cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
            cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
            var result = DataFactory.ExecuteScalar(cmd);
            return result != null && Convert.ToInt32(result) > 0;
        }
        catch (SqlException) { return false; }
    }

    public bool Delete(int id)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = CreateCommand("DeleteEventDetailsById", conn);
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
}
