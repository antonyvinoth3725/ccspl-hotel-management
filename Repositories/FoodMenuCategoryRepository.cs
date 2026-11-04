using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories
{
    public class FoodMenuCategoryRepository : IFoodMenuCategoryRepository
    {
        public List<FoodMenuCategory> GetAll()
        {
            var list = new List<FoodMenuCategory>();
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetFoodMenuCategory", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        reader = DataFactory.ExecuteReader(cmd);
                        list = this.List(reader);
                    }
                }
                return list ?? new List<FoodMenuCategory>();
            }
            catch (SqlException)
            {
                return new List<FoodMenuCategory>();
            }
            catch (Exception)
            {
                return new List<FoodMenuCategory>();
            }
            finally
            {
                if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
            }
        }

        public FoodMenuCategory? GetById(string id)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            FoodMenuCategory? item = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetFoodMenuCategoryById", conn))
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

        public int Create(FoodMenuCategory item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_CreateFoodMenuCategory", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@MaxChoice", (object?)item.MaxChoice ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));

                        var result = DataFactory.ExecuteScalar(cmd);
                        if (result != null)
                        {
                            //item.Id = Convert.ToString(result) ?? item.Id;
                            return Convert.ToInt32(result);
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

        public int Update(FoodMenuCategory item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_UpdateFoodMenuCategory", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@MaxChoice", (object?)item.MaxChoice ?? DBNull.Value));
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

        public bool Delete(string id)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            bool taskStatus = false;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    using (cmd = DataFactory.CreateCommand("DeleteFoodMenuCategoryById", conn))
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

        public bool ActiveInActive(string id, bool status)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    using (cmd = DataFactory.CreateCommand("ActiveInActiveFoodMenuCategoryById", conn))
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
        private List<FoodMenuCategory> List(IDataReader reader)
        {
            var list = new List<FoodMenuCategory>();
            try
            {
                while (reader.Read())
                {
                    var item = new FoodMenuCategory();
                    if (reader["Id"] != DBNull.Value)
                        item.Id = Convert.ToInt32(reader["Id"])!;
                    if (reader["Code"] != DBNull.Value)
                        item.Code = Convert.ToString(reader["Code"])!;
                    if (reader["Name"] != DBNull.Value)
                        item.Name = Convert.ToString(reader["Name"])!;
                    if (reader["MaxChoice"] != DBNull.Value)
                        item.MaxChoice = Convert.ToInt32(reader["MaxChoice"])!;
                    if (reader["IsActive"] != DBNull.Value)
                        item.IsActive = Convert.ToBoolean(reader["IsActive"]);
                    if (reader["IsDeleted"] != DBNull.Value)
                        item.IsDeleted = Convert.ToBoolean(reader["IsDeleted"]);
                    if (reader["CreatedBy"] != DBNull.Value)
                        item.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);
                    if (reader["CreatedDate"] != DBNull.Value)
                        item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);

                    if (reader["UpdatedBy"] != DBNull.Value)
                        item.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);
                    if (reader["UpdatedDate"] != DBNull.Value)
                        item.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);

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
}
