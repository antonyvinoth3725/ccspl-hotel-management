using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Data;
using Microsoft.Data.SqlClient;
using System.Data;

namespace GayatriCateringPortal.Repositories
{
    public class DriverRepository : IDriverRepository
    {
        public List<DriverMaster> GetAll()
        {
            List<DriverMaster> list = new List<DriverMaster>();
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("GetDriver", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        reader = DataFactory.ExecuteReader(cmd);
                        list = this.List(reader);
                    }
                }
                return list ?? new List<DriverMaster>();
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

        public DriverMaster? GetById(int id)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            IDataReader? reader = null;
            DriverMaster? item = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_GetDriverById", conn))
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

        public int Create(DriverMaster item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_CreateDriverMaster", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", (object?)item.MobileNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", (object?)item.Email ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@LicenseNo", (object?)item.LicenseNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@LicenseExpiryDate", (object?)item.LicenseExpiryDate ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@DateofBirth", (object?)item.DateofBirth ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Gender", (object?)item.Gender ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Address", (object?)item.Address ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@City", (object?)item.City ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@State", (object?)item.State ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Pincode", (object?)item.Pincode ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@VehicleType", (object?)item.VehicleType ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@VehicleNo", (object?)item.VehicleNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ExpYears", item.ExperienceYears));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Joiningdate", (object?)item.JoiningDate ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EmployeeType", item.EmployeeType));

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

        public int Update(DriverMaster item)
        {
            IDbConnection? conn = null;
            IDbCommand? cmd = null;
            try
            {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SP_UpdateDriver", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", (object?)item.Id ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Code", (object?)item.Code ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Name", (object?)item.Name ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@MobileNo", (object?)item.MobileNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Email", (object?)item.Email ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@LicenseNo", (object?)item.LicenseNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@LicenseExpiryDate", (object?)item.LicenseExpiryDate ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@DateofBirth", (object?)item.DateofBirth ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Gender", (object?)item.Gender ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Address", (object?)item.Address ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@City", (object?)item.City ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@State", (object?)item.State ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Pincode", (object?)item.Pincode ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@VehicleType", (object?)item.VehicleType ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@VehicleNo", (object?)item.VehicleNo ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ExpYears", item.ExperienceYears));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@Joiningdate", (object?)item.JoiningDate ?? DBNull.Value));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@EmployeeType", item.EmployeeType));

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
                    using (cmd = DataFactory.CreateCommand("DeleteDriverById", conn))
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
                    using (cmd = DataFactory.CreateCommand("ActiveInActiveDriverById", conn))
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
        private List<DriverMaster> List(IDataReader reader)
        {
            var list = new List<DriverMaster>();
            try
            {
                while (reader.Read())
                {
                    var item = new DriverMaster();
                    if (reader["Id"] != DBNull.Value)
                        item.Id = Convert.ToInt32(reader["Id"])!;
                    if (reader["Code"] != DBNull.Value)
                        item.Code = Convert.ToString(reader["Code"])!;
                    if (reader["Name"] != DBNull.Value)
                        item.Name = Convert.ToString(reader["Name"])!;
                    if (reader["MobileNo"] != DBNull.Value)
                        item.MobileNo = Convert.ToString(reader["MobileNo"]);
                    if (reader["Email"] != DBNull.Value)
                        item.Email = Convert.ToString(reader["Email"]);
                    if (reader["LicenseNo"] != DBNull.Value)
                        item.LicenseNo = Convert.ToString(reader["LicenseNo"]);
                    if (reader["LicenseExpiryDate"] != DBNull.Value)
                        item.LicenseExpiryDate = Convert.ToDateTime(reader["LicenseExpiryDate"]);
                    if (reader["DateofBirth"] != DBNull.Value)
                        item.DateofBirth = Convert.ToDateTime(reader["DateofBirth"]);
                    if (reader["Gender"] != DBNull.Value)
                        item.Gender = Convert.ToChar(reader["Gender"]);
                    if (reader["Address"] != DBNull.Value)
                        item.Address = Convert.ToString(reader["Address"]);
                    if (reader["City"] != DBNull.Value)
                        item.City = Convert.ToString(reader["City"]);
                    if (reader["state"] != DBNull.Value)
                        item.State = Convert.ToString(reader["state"]);
                    if (reader["Pincode"] != DBNull.Value)
                        item.Pincode = Convert.ToString(reader["Pincode"]);
                    if (reader["VehicleType"] != DBNull.Value)
                        item.VehicleType = Convert.ToString(reader["VehicleType"]);
                    if (reader["VehicleNo"] != DBNull.Value)
                        item.VehicleNo = Convert.ToString(reader["VehicleNo"]);
                    if (reader["ExperienceYears"] != DBNull.Value)
                        item.ExperienceYears = Convert.ToInt32(reader["ExperienceYears"]);
                    if (reader["JoiningDate"] != DBNull.Value)
                        item.JoiningDate = Convert.ToDateTime(reader["JoiningDate"]);
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
                    if (reader["EmployeeType"] != DBNull.Value)
                        item.EmployeeType = Convert.ToString(reader["EmployeeType"]);

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
