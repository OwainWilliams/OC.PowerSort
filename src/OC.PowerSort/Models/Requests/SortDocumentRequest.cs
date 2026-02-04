namespace OC.PowerSort.Models.Requests
{
    public class SortDocumentRequest
    {
        public required ParentReference Parent { get; set; }
        public required List<SortItem> Sorting { get; set; }
    }

    public class ParentReference
    {
        public Guid Id { get; set; }
    }

    public class SortItem
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
    }
}
