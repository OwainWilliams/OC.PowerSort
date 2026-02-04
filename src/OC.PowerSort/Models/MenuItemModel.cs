namespace OC.PowerSort.Models
{
    public class MenuItemModel
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
    }

    public class MenuItemsResponse
    {
        public List<MenuItemModel> Items { get; set; } = new();
    }
}
