using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers
{
    public class DriverDeliveryController : Controller
    {
        private readonly IDriverDeliveryRepository _driverRepository;

        public DriverDeliveryController(IDriverDeliveryRepository driverRepository)
        {
            _driverRepository = driverRepository;
        }
        public IActionResult Index()
        {
            return Content("Driver Delivery Controller Working");
        }

        public IActionResult Verify(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return View("InvalidLink");

            var driver = _driverRepository.VerifyDriverToken(token);

            if (driver == null)
                return View("InvalidLink");

            return View(driver);
        }

        [HttpPost]
        public IActionResult VerifyOtp(string token, string otp)
        {
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(otp))
                return Json(new { success = false, message = "Please enter the OTP." });

            bool verified = _driverRepository.VerifyOtp(token, otp);

            if (!verified)
            {
                return Json(new
                {
                    success = false,
                    message = "Invalid OTP"
                });
            }

            var driver = _driverRepository.VerifyDriverToken(token);

            if (driver == null)
                return Json(new { success = false, message = "This driver link has expired." });

            HttpContext.Session.SetInt32("DriverId", driver.DriverId);
            HttpContext.Session.SetString("DriverAccessToken", driver.Token);

            return Json(new
            {
                success = true,
                redirect = "/DriverDelivery/Deliveries"
            });
        }

        public IActionResult Deliveries()
        {
            //if (!TryGetAuthenticatedDriver(out var driverId))
            //return RedirectToAction("Verify");

            int? driverId = HttpContext.Session.GetInt32("DriverId");

            if (driverId == null)
                return RedirectToAction("Verify");

            var model = _driverRepository.GetAssignedInvoices(driverId);

            return View(model);
        }

        public IActionResult Delivery(int logisticsId)
        {
            if (!TryGetAuthenticatedDriver(out var driverId))
                return RedirectToAction("Verify");

            if (!_driverRepository.IsLogisticsAssignedToDriver(logisticsId, driverId))
                return Forbid();

            //if (!_driverRepository.CanDriverStartDelivery(logisticsId, driverId))
            //    return RedirectToAction("Deliveries");

            var model = _driverRepository.GetInvoiceDetails(logisticsId);

            if (model == null)
                return RedirectToAction("Deliveries");

            return View(model);
        }

        [HttpPost]
        public IActionResult CompleteDelivery(DeliveryProofVM model)
        {
            if (!ModelState.IsValid)
            {
                return Json(new
                {
                    success = false,
                    message = "Invalid Request"
                });
            }

            if (!TryGetAuthenticatedDriver(out var driverId))
                return Json(new { success = false, message = "Your session has expired. Please open today's link again." });

            if (!_driverRepository.IsLogisticsAssignedToDriver(model.LogisticsId, driverId))
                return Json(new { success = false, message = "You are not assigned to this delivery." });

            model.DriverId = driverId;
            int result = _driverRepository.SaveDeliveryProof(model);

            if (result == 1)
            {
                return Json(new
                {
                    success = true,
                    message = "Delivery Completed Successfully"
                });
            }

            return Json(new
            {
                success = false,
                message = "Unable to Save"
            });
        }

        private bool TryGetAuthenticatedDriver(out int driverId)
        {
            driverId = HttpContext.Session.GetInt32("DriverId") ?? 0;
            var token = HttpContext.Session.GetString("DriverAccessToken");

            if (driverId <= 0 || string.IsNullOrWhiteSpace(token) ||
                !_driverRepository.IsDriverSessionValid(driverId, token))
            {
                HttpContext.Session.Clear();
                return false;
            }

            return true;
        }
    }
}
