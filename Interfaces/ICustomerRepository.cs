using GayatriCateringPortal.Models;
using System.Collections.Generic;

namespace GayatriCateringPortal.Interfaces;

public interface ICustomerRepository
{
    List<CustomerMaster> GetAll();
    CustomerMaster? GetById(int id);
    int Create(CustomerMaster customer);
    bool Update(CustomerMaster customer);
    bool Delete(int id);
    public bool ActiveInActive(int id, bool status);
}
