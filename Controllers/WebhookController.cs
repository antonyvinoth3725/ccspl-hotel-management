using GayatriCateringPortal.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers
{
    [Route("Webhook")]
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public class WebhookController : Controller
    {
        private readonly IOrdersRepository _orders;

        public WebhookController(IOrdersRepository orders)
        {
            _orders = orders;
        }
    }
}
