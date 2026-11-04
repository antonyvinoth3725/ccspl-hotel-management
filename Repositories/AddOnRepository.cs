using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System.Data;

namespace GayatriCateringPortal.Repositories
{
    public class AddOnRepository:IAddOnRepository
    {


        public List<AddOnMaster> GetAll()
        {
            List<AddOnMaster> list = new List<AddOnMaster>();
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();

                    using (cmd = DataFactory.CreateCommand(
                        "[dbo].[GetAddOnMaster]", conn))
                    {
                        ((SqlCommand)cmd).CommandType =
                            CommandType.StoredProcedure;

                        reader = DataFactory.ExecuteReader(cmd);

                        list = this.List(reader);
                    }
                }

                return list ?? new List<AddOnMaster>();
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




        public AddOnMaster? GetById(int id)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;
            IDataReader reader = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("[dbo].[SP_GetAddOnMasterById]", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                        reader = DataFactory.ExecuteReader(cmd);
                        return List(reader).FirstOrDefault();
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

        public int Create(AddOnMaster item)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("[dbo].[SP_CreateAddOnMaster]", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", item.Code));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@AddOnName", item.AddOnName));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UnitType", item.UnitType));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Rate", item.Rate));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));

                        return Convert.ToInt32(DataFactory.ExecuteScalar(cmd) ?? 0);
                    }
                }
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
        }

        public int Update(AddOnMaster item)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("[dbo].[SP_UpdateAddOnMaster]", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", item.Code));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@AddOnName", item.AddOnName));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UnitType", item.UnitType));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Rate", item.Rate));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));
                        return Convert.ToInt32(DataFactory.ExecuteScalar(cmd) ?? 0);
                    }
                }
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
        }

        public bool Delete(int id)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("[dbo].[DeleteAddOnMasterById]", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                        return Convert.ToInt32(DataFactory.ExecuteScalar(cmd) ?? 0) > 0;
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

        public bool ActiveInActive(int id, bool status)
        {
            IDbConnection conn = null;
            IDbCommand cmd = null;

            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("[dbo].[ActiveInActiveAddOnMasterById]", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", status));
                        return Convert.ToInt32(DataFactory.ExecuteScalar(cmd) ?? 0) > 0;
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

        // COMMON DATA READER MAPPING
        private List<AddOnMaster> List(IDataReader reader)
        {
            var list = new List<AddOnMaster>();

            try
            {
                while (reader.Read())
                {
                    var addOn = new AddOnMaster();

                    if (reader["Id"] != DBNull.Value)
                        addOn.Id =
                            Convert.ToInt32(
                                reader["Id"]);


                    if (reader["Code"] != DBNull.Value)
                        addOn.Code =
                            Convert.ToString(
                                reader["Code"]) ?? string.Empty;


                    if (reader["AddOnName"] != DBNull.Value)
                        addOn.AddOnName =
                            Convert.ToString(
                                reader["AddOnName"]) ?? string.Empty;


                    if (reader["UnitType"] != DBNull.Value)
                        addOn.UnitType =
                            Convert.ToString(
                                reader["UnitType"]) ?? string.Empty;


                    if (reader["Rate"] != DBNull.Value)
                        addOn.Rate =
                            Convert.ToDecimal(
                                reader["Rate"]);


                    if (reader["IsActive"] != DBNull.Value)
                        addOn.IsActive =
                            Convert.ToBoolean(
                                reader["IsActive"]);


                    if (reader["IsDeleted"] != DBNull.Value)
                        addOn.IsDeleted =
                            Convert.ToBoolean(
                                reader["IsDeleted"]);


                    if (reader["CreatedBy"] != DBNull.Value)
                        addOn.CreatedBy =
                            Convert.ToInt32(
                                reader["CreatedBy"]);


                    if (reader["CreatedDate"] != DBNull.Value)
                        addOn.CreatedDate =
                            Convert.ToDateTime(
                                reader["CreatedDate"]);


                    if (reader["UpdatedBy"] != DBNull.Value)
                        addOn.UpdatedBy =
                            Convert.ToInt32(
                                reader["UpdatedBy"]);


                    if (reader["UpdatedDate"] != DBNull.Value)
                        addOn.UpdatedDate =
                            Convert.ToDateTime(
                                reader["UpdatedDate"]);


                    list.Add(addOn);
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
                    "AddOn mapping error: " +
                    ex.Message);
            }

            return list;
        }
    }
}
