using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Net.NetworkInformation;
using System.Reflection.PortableExecutable;

namespace GayatriCateringPortal.Repositories;

public class UtensilsRepository : IUtensilsRepository
{
    public List<UtensilMaster> GetAll()
    {
        var list = new List<UtensilMaster>();
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetUtensilMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }
            return list ?? new List<UtensilMaster>();
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error while loading utensils: " + ex.Message, ex);
        }
        catch (Exception ex)
        {
            throw new Exception("Unable to load utensils: " + ex.Message, ex);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public UtensilMaster? GetById(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        UtensilMaster? item = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetUtensilMasterById", conn))
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

    public int Create(UtensilMaster item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateUtensilMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UtensilName", (object?)item.UtensilName ?? DBNull.Value));
                    AddRuleParameters(cmd, item);
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Price", (object?)item.Price ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DepositAmount", (object?)item.DepositAmount ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        //item.Id = Convert.ToString(result) ?? item.Id;
                        return Convert.ToInt32(result);
                    }
                }
            }
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error: " + ex.Message, ex);
        }
        catch (Exception ex)
        {
            throw new Exception("Unable to create utensil: " + ex.Message, ex);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
        return 0;
    }

    public int Update(UtensilMaster item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdateUtensilMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UtensilName", (object?)item.UtensilName ?? DBNull.Value));
                    AddRuleParameters(cmd, item);
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Price", (object?)item.Price ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DepositAmount", (object?)item.DepositAmount ?? DBNull.Value)); 
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));

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

    public bool Delete(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        bool taskStatus = false;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("DeleteUtensilMasterById", conn))
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
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("ActiveInActiveUtensilMasterById", conn))
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
    private List<UtensilMaster> List(IDataReader reader)
    {
        var list = new List<UtensilMaster>();
        try
        {
            var columns = Enumerable.Range(0, reader.FieldCount)
                .Select(reader.GetName)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            object? Value(string column) =>
                columns.Contains(column) && reader[column] != DBNull.Value ? reader[column] : null;

            while (reader.Read())
            {
                var item = new UtensilMaster
                {
                    Id = Value("Id") is { } id ? Convert.ToInt32(id) : 0,
                    UtensilName = Convert.ToString(Value("UtensilName")) ?? string.Empty,
                    RuleType = Convert.ToString(Value("RuleType")) ?? "PAX",
                    RuleOperator = Convert.ToString(Value("RuleOperator")) ?? "SAME",
                    RuleValue = Value("RuleValue") is { } ruleValue ? Convert.ToDecimal(ruleValue) : 0,
                    RulePercentage = Value("RulePercentage") is { } percentage ? Convert.ToDecimal(percentage) : 0,
                    MinimumQty = Value("MinimumQty") is { } minimumQty ? Convert.ToInt32(minimumQty) : 0,
                    RuleDescription = Convert.ToString(Value("RuleDescription")),
                    Price = Value("Price") is { } price ? Convert.ToDecimal(price) : 0,
                    DepositAmount = Value("DepositAmount") is { } deposit ? Convert.ToDecimal(deposit) : 0,
                    IsActive = Value("IsActive") is not { } active || Convert.ToBoolean(active),
                    IsDeleted = Value("IsDeleted") is { } deleted && Convert.ToBoolean(deleted),
                    CreatedBy = Value("CreatedBy") is { } createdBy ? Convert.ToInt32(createdBy) : 0,
                    CreatedDate = Value("CreatedDate") is { } createdDate ? Convert.ToDateTime(createdDate) : DateTime.MinValue,
                    UpdatedBy = Value("UpdatedBy") is { } updatedBy ? Convert.ToInt32(updatedBy) : 0,
                    UpdatedDate = Value("UpdatedDate") is { } updatedDate ? Convert.ToDateTime(updatedDate) : (DateTime?)null
                };

                list.Add(item);
            }
        }
        catch (SqlException ex)
        {
            throw new Exception("Database error while reading utensils: " + ex.Message, ex);
        }
        catch (Exception ex)
        {
            throw new Exception("Unable to read utensils: " + ex.Message, ex);
        }

        return list;
    }
    #endregion

    private static void AddRuleParameters(IDbCommand cmd, UtensilMaster item)
    {
        cmd.Parameters.Add(DataFactory.CreateParameter("@RuleType", item.RuleType));
        cmd.Parameters.Add(DataFactory.CreateParameter("@RuleOperator", item.RuleOperator));
        cmd.Parameters.Add(DataFactory.CreateParameter("@RuleValue", item.RuleValue));
        cmd.Parameters.Add(DataFactory.CreateParameter("@RulePercentage", item.RulePercentage));
        cmd.Parameters.Add(DataFactory.CreateParameter("@MinimumQty", item.MinimumQty));
        cmd.Parameters.Add(DataFactory.CreateParameter("@RuleDescription", (object?)item.RuleDescription ?? DBNull.Value));
    }
}

