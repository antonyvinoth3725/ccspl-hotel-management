using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IKitchenRepository
{
    List<KitchenQueueOrder> GetKitchenQueueOrders(int Status, string Fromdate, string ToDate);
  
}
