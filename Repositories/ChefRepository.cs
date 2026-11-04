using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System.Data;

namespace GayatriCateringPortal.Repositories
{
    public class ChefRepository : IChefRepository
    {
        public List<ChefMaster> GetAll()
        {
            List<ChefMaster> list = new List<ChefMaster>();
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetChef", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        reader = DataFactory.ExecuteReader(cmd);
                        list = this.List(reader);
                    }
                }
                return list ?? new List<ChefMaster>();
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

        public ChefMaster? GetById(int id)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            ChefMaster? item = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetChefById", conn))
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

        public int Create(ChefMaster item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_CreateChefMaster", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", (object?)item.MobileNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EmailId", (object?)item.EmailId ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ChefType", (object?)item.ChefType ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Specialization", (object?)item.Specialization ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@KitchenBranch", (object?)item.KitchenBranch ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@JoiningDate", (object?)item.JoiningDate ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EmploymentStatus", (object?)item.EmploymentStatus ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Address", (object?)item.Address ?? DBNull.Value));                        
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

        public int Update(ChefMaster item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_UpdateChefMaster", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", (object?)item.Id ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", (object?)item.MobileNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EmailId", (object?)item.EmailId ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ChefType", (object?)item.ChefType ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Specialization", (object?)item.Specialization ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@KitchenBranch", (object?)item.KitchenBranch ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@JoiningDate", (object?)item.JoiningDate ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EmploymentStatus", (object?)item.EmploymentStatus ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Address", (object?)item.Address ?? DBNull.Value));
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
                    using (cmd = DataFactory.CreateCommand("DeleteChefById", conn))
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
                    using (cmd = DataFactory.CreateCommand("ActiveInActiveChefById", conn))
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
        private List<ChefMaster> List(IDataReader reader)
        {
            var list = new List<ChefMaster>();
            try
            {
                while (reader.Read())
                {
                    var item = new ChefMaster();
                    if (reader["Id"] != DBNull.Value)
                        item.Id = Convert.ToInt32(reader["Id"])!;
                    if (reader["Code"] != DBNull.Value)
                        item.Code = Convert.ToString(reader["Code"])!;
                    if (reader["Name"] != DBNull.Value)
                        item.Name = Convert.ToString(reader["Name"])!;
                    if (reader["MobileNo"] != DBNull.Value)
                        item.MobileNo = Convert.ToString(reader["MobileNo"]);
                    if (reader["EmailId"] != DBNull.Value)
                        item.EmailId = Convert.ToString(reader["EmailId"]);
                    if (reader["ChefType"] != DBNull.Value)
                        item.ChefType = Convert.ToString(reader["ChefType"]);
                    if (reader["Specialization"] != DBNull.Value)
                        item.Specialization = Convert.ToString(reader["Specialization"]);
                    if (reader["KitchenBranch"] != DBNull.Value)
                        item.KitchenBranch = Convert.ToString(reader["KitchenBranch"]);
                    if (reader["JoiningDate"] != DBNull.Value)
                        item.JoiningDate = Convert.ToDateTime(reader["JoiningDate"]);
                    if (reader["EmploymentStatus"] != DBNull.Value)
                        item.EmploymentStatus = Convert.ToString(reader["EmploymentStatus"]);
                    if (reader["Address"] != DBNull.Value)
                        item.Address = Convert.ToString(reader["Address"]); 
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
