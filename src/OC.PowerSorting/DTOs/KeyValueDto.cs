using NPoco;

namespace OC.PowerSorting.DTOs
{
    [TableName("umbracoKeyValue")]
    [PrimaryKey("key", AutoIncrement = false)]
    public class KeyValueDto
    {
        [Column("key")]
        public string Key { get; set; } = string.Empty;

        [Column("value")]
        public string Value { get; set; } = string.Empty;

        [Column("updated")]
        public DateTime Updated { get; set; }
    }
}
