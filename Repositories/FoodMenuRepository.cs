using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System.Data;

namespace GayatriCateringPortal.Repositories
{
    public class FoodMenuRepository : IFoodMenuRepository
    {
        private static bool HasColumn(IDataRecord record, string columnName)
        {
            for (var i = 0; i < record.FieldCount; i++)
            {
                if (string.Equals(record.GetName(i), columnName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        public List<FoodMenu> GetAll()
        {
            List<FoodMenu> list = new List<FoodMenu>();
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetFoodMenu", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        reader = DataFactory.ExecuteReader(cmd);
                        list = this.List(reader);
                    }
                }
                return list;
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

        public List<MenuCategoryResult> GetAllMenusByCategory()
        {
            var categories = new List<MenuCategoryResult>();
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetAllMenuByCategoryId", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        reader = DataFactory.ExecuteReader(cmd);

                        var categoriesById = new Dictionary<int, MenuCategoryResult>();
                        while (reader.Read())
                        {
                            var categoryId = Convert.ToInt32(reader["CategoryId"]);
                            if (!categoriesById.TryGetValue(categoryId, out var category))
                            {
                                category = new MenuCategoryResult();
                                category.Id = categoryId;
                                if (reader["CategoryName"] != DBNull.Value)
                                    category.Name = Convert.ToString(reader["CategoryName"]) ?? string.Empty;

                                if (HasColumn(reader, "MaxChoice") && reader["MaxChoice"] != DBNull.Value)
                                    category.MaxChoice = Convert.ToInt32(reader["MaxChoice"]);

                                categoriesById.Add(categoryId, category);
                                categories.Add(category);
                            }

                            category.Items.Add(new MenuItemResult
                            {
                                Id = Convert.ToInt32(reader["MenuId"]),
                                Name = Convert.ToString(reader["MenuName"]) ?? string.Empty,
                                Price = reader["Price"] == DBNull.Value ? null : Convert.ToString(reader["Price"]),
                                FoodType = reader["FoodType"] == DBNull.Value ? null : Convert.ToInt32(reader["FoodType"]),
                            });
                        }
                    }
                }

                return categories;
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

        public List<FoodMenu> GetByCategoryId(int categoryId)
        {
            if (categoryId <= 0) return new List<FoodMenu>();

            List<FoodMenu> list = new List<FoodMenu>();
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetAllMenuByCategoryId", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CategoryId", categoryId));
                        reader = DataFactory.ExecuteReader(cmd);
                        list = ListMenu(reader);
                    }
                }

                return list ?? new List<FoodMenu>();
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

        public FoodMenu? GetById(int id)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            FoodMenu? item = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetFoodMenuById", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                        reader = DataFactory.ExecuteReader(cmd);
                        var list = this.ListMenu(reader);
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

        public int Create(FoodMenu item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_CreateFoodMenu", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CategoryId", (object?)item.CategoryId  ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Price", (object?)item.Price ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@FoodType", (object?)item.FoodType ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));


                        var result = DataFactory.ExecuteScalar(cmd);
                        if (result != null)
                        {
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

        public int Update(FoodMenu item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_UpdateFoodMenu", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CategoryId", (object?)item.CategoryId ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Price", (object?)item.Price ?? DBNull.Value));
                       
                        cmd.Parameters.Add(DataFactory.CreateParameter("@FoodType", (object?)item.FoodType ?? DBNull.Value));
                        
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
                    using (cmd = DataFactory.CreateCommand("DeleteFoodMenuById", conn))
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
                    using (cmd = DataFactory.CreateCommand("ActiveInActiveFoodMenuById", conn))
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
        private List<FoodMenu> List(IDataReader reader)
        {
            var list = new List<FoodMenu>();
            try
            {
                while (reader.Read())
                {
                    var item = new FoodMenu();
                    if (reader["Id"] != DBNull.Value)
                        item.Id = Convert.ToInt32(reader["Id"])!;
                    if (reader["SNo"] != DBNull.Value)
                        item.SNo = Convert.ToInt32(reader["SNo"])!;
                    if (reader["Code"] != DBNull.Value)
                        item.Code = Convert.ToString(reader["Code"])!;
                    if (reader["Name"] != DBNull.Value)
                        item.Name = Convert.ToString(reader["Name"])!;
                    if (reader["CategoryId"] != DBNull.Value)
                        item.CategoryId = Convert.ToInt32(reader["CategoryId"]);
                    if (reader["Price"] != DBNull.Value)
                        item.Price = Convert.ToDecimal(reader["Price"]);
                    if (reader["FoodType"] != DBNull.Value)
                        item.FoodType = Convert.ToInt32(reader["FoodType"]);
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
                    if (reader["Category"] != DBNull.Value)
                        item.Category = Convert.ToString(reader["Category"])!;

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

        #region Private Methods
        private List<FoodMenu> ListMenu(IDataReader reader)
        {
            var list = new List<FoodMenu>();
            try
            {
                while (reader.Read())
                {
                    var item = new FoodMenu();
                    if (reader["Id"] != DBNull.Value)
                        item.Id = Convert.ToInt32(reader["Id"])!;
                    if (reader["Code"] != DBNull.Value)
                        item.Code = Convert.ToString(reader["Code"])!;
                    if (reader["Name"] != DBNull.Value)
                        item.Name = Convert.ToString(reader["Name"])!;
                    if (reader["CategoryId"] != DBNull.Value)
                        item.CategoryId = Convert.ToInt32(reader["CategoryId"]);
                    if (reader["Price"] != DBNull.Value)
                        item.Price = Convert.ToDecimal(reader["Price"]);
                    if (reader["FoodType"] != DBNull.Value)
                        item.FoodType = Convert.ToInt32(reader["FoodType"]);
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
