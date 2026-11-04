using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class CodeTemplateRepository : ICodeTemplateRepository
{
    public List<CodeTemplate> GetAll()
    {
        List<CodeTemplate> list = new List<CodeTemplate>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetCodeTemplate", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<CodeTemplate>();
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

    public int Save(List<CodeTemplate> items)
    {
        if (items == null || items.Count == 0)
            return 0;

        int savedCount = 0;

        foreach (var item in items)
        {
            int id = SaveItem(item);
            if (id <= 0)
                return 0;

            savedCount++;
        }

        return savedCount;
    }

    private int SaveItem(CodeTemplate item)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateCodeTemplate", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", string.IsNullOrWhiteSpace(item.Name) ? DBNull.Value : item.Name.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@StartValue", item.StartValue));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Prefix", string.IsNullOrWhiteSpace(item.Prefix) ? DBNull.Value : item.Prefix.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CurrentValue", item.CurrentValue));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Suffix", string.IsNullOrWhiteSpace(item.Suffix) ? DBNull.Value : item.Suffix.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@NoOfDigit", item.NoOfDigit));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDateMonthYearWise", item.IsDateMonthYearWise));

                    reader = DataFactory.ExecuteReader(cmd);
                    if (reader.Read())
                    {
                        if (reader["Id"] != DBNull.Value)
                            return Convert.ToInt32(reader["Id"]);
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
            if (reader != null) reader.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }

        return 0;
    }

    public bool UpdateCurrentValue(int entityNo)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdateCodeTemplateCurrentValue", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", entityNo));
                    return DataFactory.ExecuteNonQuery(cmd) > 0;
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

    public string GetLatestCode(int entityNo)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetLatestCode", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", entityNo));
                    var result = DataFactory.ExecuteScalar(cmd);
                    return result == null || result == DBNull.Value ? string.Empty : Convert.ToString(result) ?? string.Empty;
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
    private List<CodeTemplate> List(IDataReader reader)
    {
        var list = new List<CodeTemplate>();
        try
        {
            while (reader.Read())
            {
                var item = new CodeTemplate();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"]);
                if (reader["EntityNo"] != DBNull.Value)
                    item.EntityNo = Convert.ToInt32(reader["EntityNo"]);
                if (reader["Name"] != DBNull.Value)
                    item.Name = Convert.ToString(reader["Name"]);
                if (reader["StartValue"] != DBNull.Value)
                    item.StartValue = Convert.ToInt32(reader["StartValue"]);
                if (reader["NoOfDigit"] != DBNull.Value)
                    item.NoOfDigit = Convert.ToInt32(reader["NoOfDigit"]);
                if (reader["Prefix"] != DBNull.Value)
                    item.Prefix = Convert.ToString(reader["Prefix"]);
                if (reader["CurrentValue"] != DBNull.Value)
                    item.CurrentValue = Convert.ToInt32(reader["CurrentValue"]);
                if (reader["Suffix"] != DBNull.Value)
                    item.Suffix = Convert.ToString(reader["Suffix"]);
                if (reader["IsDateMonthYearWise"] != DBNull.Value)
                    item.IsDateMonthYearWise = Convert.ToBoolean(reader["IsDateMonthYearWise"]);
                if (reader["IsActive"] != DBNull.Value)
                    item.IsActive = Convert.ToBoolean(reader["IsActive"]);

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
