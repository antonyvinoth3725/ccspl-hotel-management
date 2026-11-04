using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);
const long MaxUploadBytes = 262_144_000; // 250 MB

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = MaxUploadBytes;
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = MaxUploadBytes;
});

builder.Services.AddScoped<GayatriCateringPortal.Common.GlobalExceptionFilter>();
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.AddService<GayatriCateringPortal.Common.GlobalExceptionFilter>();
});
var dataProtectionKeysPath = Path.Combine(builder.Environment.ContentRootPath, "DataProtectionKeys");
builder.Services.AddDataProtection()
    .SetApplicationName("GayatriCateringPortal")
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.IdleTimeout = TimeSpan.FromHours(8);
});

// Initialize DataFactory (centralized ADO.NET helpers)
GayatriCateringPortal.Data.DataFactory.Init(builder.Configuration);

// Repositories
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ICustomerRepository, GayatriCateringPortal.Repositories.CustomerRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ICommsRepository, GayatriCateringPortal.Repositories.CommsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IFreebiesRepository, GayatriCateringPortal.Repositories.FreebiesRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IFinanceRepository, GayatriCateringPortal.Repositories.FinanceRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IDashboardRepository, GayatriCateringPortal.Repositories.DashboardRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IKitchenRepository, GayatriCateringPortal.Repositories.KitchenRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IInvoicesRepository, GayatriCateringPortal.Repositories.InvoicesRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ILocationsRepository, GayatriCateringPortal.Repositories.LocationRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ILogisticsRepository, GayatriCateringPortal.Repositories.LogisticsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IQuotationsRepository, GayatriCateringPortal.Repositories.QuotationsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IPackagesRepository, GayatriCateringPortal.Repositories.PackagesRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IPackageItemsRepository, GayatriCateringPortal.Repositories.PackageItemsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IPackageMenusRepository, GayatriCateringPortal.Repositories.PackageMenusRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IMenusRepository, GayatriCateringPortal.Repositories.MenusRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IMealPeriodsRepository, GayatriCateringPortal.Repositories.MealPeriodRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IRolesRepository, GayatriCateringPortal.Repositories.RolesRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IReportsRepository, GayatriCateringPortal.Repositories.ReportsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IUtensilsRepository, GayatriCateringPortal.Repositories.UtensilsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ISettingsRepository, GayatriCateringPortal.Repositories.SettingsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ICodeTemplateRepository, GayatriCateringPortal.Repositories.CodeTemplateRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IOrdersRepository, GayatriCateringPortal.Repositories.OrdersRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IOrderPaymentRepository, GayatriCateringPortal.Repositories.OrderPaymentRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IOrderRefundRepository, GayatriCateringPortal.Repositories.OrderRefundRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IViewOrderDetailsRepository, GayatriCateringPortal.Repositories.ViewOrderDetailsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IFoodMenuRepository, GayatriCateringPortal.Repositories.FoodMenuRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ICommonRepository, GayatriCateringPortal.Repositories.CommonRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IFoodMenuCategoryRepository, GayatriCateringPortal.Repositories.FoodMenuCategoryRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IUsersRepository, GayatriCateringPortal.Repositories.UsersRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.ILoginRepository, GayatriCateringPortal.Repositories.LoginRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IUserRoleMappingRepository, GayatriCateringPortal.Repositories.UserRoleMappingRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IAddOnRepository, GayatriCateringPortal.Repositories.AddOnRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IEventMasterRepository, GayatriCateringPortal.Repositories.EventMasterRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IEventDetailsRepository, GayatriCateringPortal.Repositories.EventDetailsRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IDriverRepository, GayatriCateringPortal.Repositories.DriverRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.Customer.IPackageRepository, GayatriCateringPortal.Repositories.Customer.PackageRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.Customer.IMYOrderRepository, GayatriCateringPortal.Repositories.Customer.MYOrderRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IDriverDeliveryRepository, GayatriCateringPortal.Repositories.DriverDeliveryRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IChefRepository, GayatriCateringPortal.Repositories.ChefRepository>();
builder.Services.AddScoped<GayatriCateringPortal.Interfaces.IChefMenuAssignmentRepository, GayatriCateringPortal.Repositories.ChefMenuAssignmentRepository>();

builder.Services.AddHttpClient();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseSession();
app.UseMiddleware<GayatriCateringPortal.Common.AdminSessionMiddleware>();
app.MapStaticAssets();

// Register controllers that use explicit route attributes, including the
// public customer order-signature link (/Customer/OrderSignature?token=...).
app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Root}/{action=Index}/{id?}");

app.Run();
