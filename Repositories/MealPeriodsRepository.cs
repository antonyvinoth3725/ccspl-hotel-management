using System.Data;
using System.Collections.Generic;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class MealPeriodRepository : IMealPeriodsRepository
{
    public List<MealPeriodMaster> GetAll()
    {
        List<MealPeriodMaster> list = new List<MealPeriodMaster>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetMealPeriodMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<MealPeriodMaster>();
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


    public MealPeriodMaster? GetById(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;
        MealPeriodMaster? item = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetMealPeriodMasterById", conn))
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


    public int Create(MealPeriodMaster mealPeriod)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                using (cmd = DataFactory.CreateCommand("SP_CreateMealPeriodMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", string.IsNullOrWhiteSpace(mealPeriod.Code) ? DBNull.Value : mealPeriod.Code.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@MealPeriodName", mealPeriod.MealPeriodName.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@StartTime", mealPeriod.StartTime.HasValue ? mealPeriod.StartTime.Value.ToTimeSpan() : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EndTime", mealPeriod.EndTime.HasValue ? mealPeriod.EndTime.Value.ToTimeSpan() : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DisplayOrder", mealPeriod.DisplayOrder));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", mealPeriod.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", mealPeriod.IsDeleted ?? false));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", mealPeriod.CreatedBy.HasValue ? mealPeriod.CreatedBy.Value : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedDate", mealPeriod.CreatedDate == default ? DateTime.Now : mealPeriod.CreatedDate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", mealPeriod.EntityNo));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        return Convert.ToInt32(result);  // Returns -1 if duplicate, > 0 if success, 0 if error
                    }
                }
            }
        }
        catch (ArgumentException)
        {
            throw;
        }
        catch (SqlException)
        {
            return 0;
        }
        catch (Exception)
        {
            return 0;
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }

        return 0;
    }


    public int Update(MealPeriodMaster mealPeriod)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
           
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                using (cmd = DataFactory.CreateCommand("SP_UpdateMealPeriodMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", mealPeriod.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", string.IsNullOrWhiteSpace(mealPeriod.Code) ? DBNull.Value : mealPeriod.Code.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@MealPeriodName", mealPeriod.MealPeriodName.Trim()));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@StartTime", mealPeriod.StartTime.HasValue ? mealPeriod.StartTime.Value.ToTimeSpan() : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EndTime", mealPeriod.EndTime.HasValue ? mealPeriod.EndTime.Value.ToTimeSpan() : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DisplayOrder", mealPeriod.DisplayOrder));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", mealPeriod.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", mealPeriod.IsDeleted ?? false));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", mealPeriod.UpdatedBy.HasValue ? mealPeriod.UpdatedBy.Value : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedDate", DateTime.Now));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        int status = Convert.ToInt32(result);
                        return status;  // Returns -1 if duplicate, > 0 if success, 0 if error
                    }
                }
            }
        }
        catch (ArgumentException)
        {
            throw;
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception)
        {
            throw;
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
                using (cmd = DataFactory.CreateCommand("DeleteMealPeriodMasterById", conn))
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
                using (cmd = DataFactory.CreateCommand("ActiveInActiveMealPeriodMasterById", conn))
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

    private List<MealPeriodMaster> List(IDataReader reader)
    {
        var list = new List<MealPeriodMaster>();

        try
        {
            while (reader.Read())
            {
                var item = new MealPeriodMaster();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"]);
                if (reader["Code"] != DBNull.Value)
                    item.Code = Convert.ToString(reader["Code"]) ?? string.Empty;
                if (reader["MealPeriodName"] != DBNull.Value)
                    item.MealPeriodName = Convert.ToString(reader["MealPeriodName"]) ?? string.Empty;
                if (reader["StartTime"] != DBNull.Value)
                    item.StartTime = TimeOnly.FromTimeSpan((TimeSpan)reader["StartTime"]);
                if (reader["EndTime"] != DBNull.Value)
                    item.EndTime = TimeOnly.FromTimeSpan((TimeSpan)reader["EndTime"]);
                if (reader["DisplayOrder"] != DBNull.Value)
                    item.DisplayOrder = Convert.ToInt32(reader["DisplayOrder"]);
                if (reader["IsActive"] != DBNull.Value)
                    item.IsActive = Convert.ToBoolean(reader["IsActive"]);
                if (reader["CreatedBy"] != DBNull.Value)
                    item.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);
                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);
                if (reader["UpdatedBy"] != DBNull.Value)
                    item.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);
                if (reader["UpdatedDate"] != DBNull.Value)
                    item.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);
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
