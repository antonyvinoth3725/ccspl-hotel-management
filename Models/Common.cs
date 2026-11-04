using System;
using Microsoft.AspNetCore.Http;

namespace GayatriCateringPortal.Models
{
    public class Country
    {
        public int Id { get; set; }
        public string? Name { get; set; }
    }

    public class State
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public int CountryId { get; set; }
    }

    public class City
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public int StateId { get; set; }
    }

    public class EntityMaster
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public int? EntityNo { get; set; }
        public bool? IsDeleted { get; set; }
        public bool? IsActive { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }

    public class CreateRolePermissionRequest
    {
        public int RoleId { get; set; }
        public int EntityNo { get; set; }
        public bool View { get; set; }
        public bool Create { get; set; }
        public bool Edit { get; set; }
        public bool Delete { get; set; }
        public bool? ActiveInActive { get; set; }
        public bool? Print { get; set; }
        public bool? Download { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int UpdatedBy { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
    }

    public class RolePermissionItem
    {
        public int RoleId { get; set; }
        public int EntityNo { get; set; }
        public bool View { get; set; }
        public bool Create { get; set; }
        public bool Edit { get; set; }
        public bool Delete { get; set; }
        public bool ActiveInActive { get; set; }
        public bool Download { get; set; }
        public bool Print { get; set; }
    }

    public class FileUploadResult
    {
        public string? Url { get; set; }
        public string? FileName { get; set; }
        public string? FileType { get; set; }
        public string? FullPath { get; set; }
    }

    public class SendEmailRequest
    {
        public string? ToEmail { get; set; }
        public string? CcEmail { get; set; }
        public string? Subject { get; set; }
        public string? Body { get; set; }
        public IFormFile? Attachment { get; set; }
    }

    public class SendReportEmailRequest
    {
        public string? ToEmail { get; set; }
        public string? CcEmail { get; set; }
        public string? Subject { get; set; }
        public string? EmailBody { get; set; }
        public int? ReportId { get; set; }
        public int? RoleId { get; set; }
        public int? OrderId { get; set; }
        public string? ReportFiltersJson { get; set; }
    }
}