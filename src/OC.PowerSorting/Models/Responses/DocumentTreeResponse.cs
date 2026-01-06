namespace OC.PowerSorting.Models.Responses
{
    public class DocumentTreeResponse
    {
        public int Total { get; set; }
        public required List<DocumentTreeItem> Items { get; set; }
    }

    public class DocumentTreeItem
    {
        public Guid Id { get; set; }
        public DocumentTypeReference? DocumentType { get; set; }
        public List<DocumentVariant>? Variants { get; set; }
        public bool HasChildren { get; set; }
        public bool IsTrashed { get; set; }
        public DateTime CreateDate { get; set; }
    }

    public class DocumentTypeReference
    {
        public Guid Id { get; set; }
        public string? Icon { get; set; }
    }

    public class DocumentVariant
    {
        public string? Name { get; set; }
        public string? State { get; set; }
        public string? Culture { get; set; }
    }
}
