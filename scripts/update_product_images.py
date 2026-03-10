"""
Expand product image variety — assign 20+ unique Unsplash images per category.
Previously each category had only 8 images for 42 products.
"""
import os
import sys
import random
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "blaize-bazaar", "backend", ".env"))

random.seed(42)  # Reproducible

BASE = "https://images.unsplash.com/"
QS = "?w=400&q=80"

def url(photo_id: str) -> str:
    return f"{BASE}{photo_id}{QS}"

# ─── Expanded image pools (20+ per category) ───────────────────────────
CATEGORY_IMAGES = {
    "Fragrances": [
        "photo-1557170334-a9632e77c6e4", "photo-1585386959984-a4155224a1ad",
        "photo-1588405748880-12d1d2a59f75", "photo-1541643600914-78b084683601",
        "photo-1523293182086-7651a899d37f", "photo-1547887538-e3a2f32cb1cc",
        "photo-1563170351-be82bc888aa4", "photo-1592945403244-b3fbafd7f539",
        "photo-1585218334450-afcf929da36e", "photo-1582211594533-268f4f1edcb9",
        "photo-1594125311687-3b1b3eafa9f4", "photo-1594035910387-fea47794261f",
        "photo-1615160460366-2c9a41771b51", "photo-1615160460524-432433ba1b8f",
        "photo-1608721279136-cd41b752fa41", "photo-1622618991746-fe6004db3a47",
        "photo-1585218356022-6a53145f56f6", "photo-1610113233329-1c73b6f7fe98",
        "photo-1680607622631-1e243ddd6782", "photo-1664198891866-8a35b73bb95f",
    ],
    "Laptops": [
        "photo-1496181133206-80ce9b88a853", "photo-1525547719571-a2d4ac8945e2",
        "photo-1517336714731-489689fd1ca8", "photo-1541807084-5c52b6b3adef",
        "photo-1611186871348-b1ce696e52c9", "photo-1484788984921-03950022c9ef",
        "photo-1531297484001-80022131f5a1", "photo-1498050108023-c5249f4df085",
        "photo-1576697010739-6373b63f3204", "photo-1625297672303-64bf96394e10",
        "photo-1625297673326-14790108da55", "photo-1606211105533-0439bfecce21",
        "photo-1625297673112-06b459140555", "photo-1644185744493-3b1076b21dbd",
        "photo-1679277983562-d41e83f40eb5", "photo-1676279168805-97adc0d4c648",
        "photo-1623251606108-512c7c4a3507", "photo-1664574653790-cee0e10a4242",
        "photo-1660321877383-80d5c9491df5", "photo-1576697010744-a40aedd2dcca",
    ],
    "Smartphones": [
        "photo-1512054502232-10a0a035d672", "photo-1592899677977-9c10ca588bbd",
        "photo-1556656793-08538906a9f8", "photo-1510557880182-3d4d3cba35a5",
        "photo-1585060544812-6b45742d762f", "photo-1601784551446-20c9e07cdbdb",
        "photo-1511707171634-5f897ff02aa9", "photo-1565849904461-04a58ad377e0",
        "photo-1558729891-90a6422566a5", "photo-1556284257-0c29a7e245b1",
        "photo-1583183639754-7e992e58e0df", "photo-1657206226034-d03bf1766638",
        "photo-1657207012721-b889e5a33d0e", "photo-1657206225906-fd0d989a709a",
        "photo-1657206225937-5f614c7901ae", "photo-1659806361928-087a8f07f431",
        "photo-1583395838144-23dc7e3b835e", "photo-1605236453806-6ff36851218e",
        "photo-1574944985070-8f3ebc6b79d2", "photo-1598327105666-5b89351aff97",
    ],
    "Mens Watches": [
        "photo-1522312346375-d1a52e2b99b3", "photo-1612817159949-195b6eb9e31a",
        "photo-1533139502658-0198f920d8e8", "photo-1526045431048-f857369baa09",
        "photo-1524592094714-0f0654e20314", "photo-1509048191080-d2984bad6ae5",
        "photo-1539874754764-5a96559165b0", "photo-1523275335684-37898b6baf30",
        "photo-1607776933951-a39fef9e8c35", "photo-1607776905497-b4f788205f6a",
        "photo-1607776931376-f5f5ff1ec0fb", "photo-1649357585015-179ed98f513d",
        "photo-1639564879163-a2a85682410e", "photo-1636289026470-cb40ece1ebc3",
        "photo-1640416822842-1d1cd0c6b9f1", "photo-1649357584808-333476473dce",
        "photo-1636289039346-ac54cc941975", "photo-1623052946389-f29990070f71",
        "photo-1612177343582-665b93b34403", "photo-1636639821444-479368c96514",
    ],
    "Beauty": [
        "photo-1596462502278-27bfdc403348", "photo-1522335789203-aabd1fc54bc9",
        "photo-1512496015851-a90fb38ba796", "photo-1583315398-5f5d4acbf46d",
        "photo-1571781926291-c477ebfd024b", "photo-1560750588-73207b1ef5b8",
        "photo-1556228578-0d85b1a4d571", "photo-1487412947147-5cebf100ffc2",
        "photo-1586495487593-1e01d9890cd6", "photo-1606158582120-b4fc196bffad",
        "photo-1595051665600-afd01ea7c446", "photo-1613255348289-1407e4f2f980",
        "photo-1653295501005-f1681bc095de", "photo-1652706299340-e8a346491541",
        "photo-1531751519425-e1fa9110434b", "photo-1610545936431-9983d41e52b5",
        "photo-1610545936090-103156571fcb", "photo-1594465919760-441fe5908ab0",
        "photo-1673956135923-17b3500becf8", "photo-1598440947619-2c35fc9aa908",
    ],
    "Furniture": [
        "photo-1555041469-a586c61ea9bc", "photo-1618220179428-22790b461013",
        "photo-1524758631624-e2822e304c36", "photo-1567538096630-e0c55bd6374c",
        "photo-1538688525198-9b88f6f53126", "photo-1493663284031-b7e3aefcae8e",
        "photo-1506439773649-6e0eb8cfb237", "photo-1586023492125-27b2c045efd7",
        "photo-1555041469-a586c61ea9bc", "photo-1550581190-9c1c48d21d6c",
        "photo-1598300042247-d088f8ab3a91", "photo-1540574163026-643ea20ade25",
        "photo-1586105251261-72a756497a11", "photo-1616627547584-bf28cee262db",
        "photo-1616486338812-3dadae4b4ace", "photo-1618219908412-a29a1bb7b86e",
        "photo-1560448204-603b3fc33ddc", "photo-1600585152220-90363fe7e115",
        "photo-1617806118233-18e1de247200", "photo-1594026112284-02bb6f3352fe",
    ],
    "Groceries": [
        "photo-1543168256-418811576931", "photo-1498837167922-ddd27525d352",
        "photo-1543168256-418811576931", "photo-1542838132-92c53300491e",
        "photo-1553546895-531931aa1aa8", "photo-1506617420156-8e4536971650",
        "photo-1504674900247-0877df9cc836", "photo-1540420773420-3366772f4999",
        "photo-1586626205306-07e752385d35", "photo-1605447813584-26aeb3f8e6ae",
        "photo-1579410137904-03cda8069b07", "photo-1632082064140-7da23f93cf17",
        "photo-1632082049294-eaa8f423bb2e", "photo-1543168256-418811576931",
        "photo-1542838132-92c53300491e", "photo-1606787366850-de6330128bfc",
        "photo-1550989460-0adf9ea622e2", "photo-1488459716781-31db52582fe9",
        "photo-1579113800032-c38bd7635818", "photo-1526470608268-f674ce90ebd4",
    ],
    "Home Decoration": [
        "photo-1586023492125-27b2c045efd7", "photo-1507003211169-0a1dd7228f2d",
        "photo-1513694203232-719a280e022f", "photo-1616046229478-9901c5536a45",
        "photo-1615529328331-f8917597711f", "photo-1560448204-61dc36dc98c8",
        "photo-1556909114-f6e7ad7d3136", "photo-1513519245088-0e12902e35ca",
        "photo-1652101112840-47c77e335f93", "photo-1650090974911-94b90ea2a833",
        "photo-1641577880141-f46c1493b0ae", "photo-1621960144756-f783e42ec41a",
        "photo-1621960144707-bef19352369b", "photo-1619364965748-631b8422869b",
        "photo-1529390915727-eb2db934c66e", "photo-1610407796109-4da7bc773a0e",
        "photo-1618220179428-22790b461013", "photo-1522444195799-478538b28823",
        "photo-1501127122-f385ca6ddd9d", "photo-1556020685-ae41abfc9365",
    ],
    "Kitchen Accessories": [
        "photo-1556909114-f6e7ad7d3136", "photo-1590794056226-79ef0d323f32",
        "photo-1584568694244-14fbdf83bd30", "photo-1556909172-54557c7e4fb7",
        "photo-1588854337115-1c67d9247e4d", "photo-1590794056226-79ef0d323f32",
        "photo-1564277287253-934c868e54ea", "photo-1556909114-44e3e70034e2",
        "photo-1628736787397-bc033be0fe53", "photo-1632123679833-90985f2a24ce",
        "photo-1611255534761-de0f80f0152c", "photo-1649015352520-45cb10548a3d",
        "photo-1505165248533-c7d65ff76e21", "photo-1514627670085-17253b8172f8",
        "photo-1663025290849-c1ae6ab18892", "photo-1556909172-89cf0b8fdc56",
        "photo-1595257841889-eca2678571fa", "photo-1622372738946-62e02505feb3",
        "photo-1556909190-eccf4a8bf97a", "photo-1589985270826-4b7bb135bc9d",
    ],
    "Mens Shirts": [
        "photo-1596755094514-f87e34085b2c", "photo-1602810318383-e386cc2a3f98",
        "photo-1620012253295-c15cc3e65df4", "photo-1621072156002-e2fccdc0b176",
        "photo-1598033129183-c4f50c736c10", "photo-1596755094514-f87e34085b2c",
        "photo-1620012253295-c15cc3e65df4", "photo-1602810318383-e386cc2a3f98",
        "photo-1629244032690-1c243449f90a", "photo-1588514599773-507a5a5a443d",
        "photo-1629426958003-35a5583b2977", "photo-1611679716418-de755158e027",
        "photo-1635650804060-bb009bcb2ea5", "photo-1635650805015-2fa50682873a",
        "photo-1635650804263-1a1941e14df5", "photo-1635650804494-41f0ecefec22",
        "photo-1602107545989-576b14346164", "photo-1602107536707-a4a8111d3151",
        "photo-1607345366928-199ea26cfe3e", "photo-1594938298603-c8148c4dae35",
    ],
    "Mens Shoes": [
        "photo-1542291026-7eec264c27ff", "photo-1460353581641-37baddab0fa2",
        "photo-1549298916-b41d501d3772", "photo-1539185441755-769473a23570",
        "photo-1608231387042-66d1773070a5", "photo-1605348532760-6753d2c43329",
        "photo-1595950653106-6c9ebd614d3a", "photo-1600185365926-3a2ce3cdb9eb",
        "photo-1618153478389-b2ed8de18ed3", "photo-1517389274750-a758d503b69e",
        "photo-1624370671907-0f0cf92c9f88", "photo-1628619932492-a4c885c979f9",
        "photo-1543652711-77eeb35ae548", "photo-1494291793534-6f053ee9c31a",
        "photo-1638260753219-bc2ac08ecfc0", "photo-1608469927270-7e074e0ace3c",
        "photo-1534211269469-314ffbac5b34", "photo-1574565083763-40de4ea4cd9b",
        "photo-1560769629-975ec94e6a86", "photo-1584735175315-9d5df23860e6",
    ],
    "Mobile Accessories": [
        "photo-1505740420928-5e560c06d30e", "photo-1583394838336-acd977736f90",
        "photo-1572569511254-d8f925fe2cbb", "photo-1546868871-af0de0ae72be",
        "photo-1585386959984-a4155224a1ad", "photo-1589492477829-5e65395b66cc",
        "photo-1600080972464-8e5f35f63d08", "photo-1625723186993-35d6aed9eb70",
        "photo-1577954732026-2071521acdfb", "photo-1574071318508-1cdbab80d002",
        "photo-1586953208448-b95a79798f07", "photo-1605457212895-e0fbe0f6d7e4",
        "photo-1609082776666-e2a1c73d4ddd", "photo-1628815113969-0487917f7a3d",
        "photo-1606220588913-b3aacb4d2f46", "photo-1601999009162-2459b78386c9",
        "photo-1612015670817-0127d21628d4", "photo-1618577608401-46f4a95be5c0",
        "photo-1617997455403-41f36df5c3df", "photo-1622782914767-404fb9ab3f57",
    ],
    "Motorcycle": [
        "photo-1558981806-ec527fa84c39", "photo-1568772585407-9361f9bf3a87",
        "photo-1449426468159-d96dbf08f19f", "photo-1558980394-da1f85d3b540",
        "photo-1580310614729-ccd69652491d", "photo-1609630875171-b1321377ee65",
        "photo-1591637333184-19aa84b3e01f", "photo-1571646750069-1a5ff32e0d94",
        "photo-1612185215798-8d644a00b246", "photo-1676247006457-1c2990480936",
        "photo-1676246908315-d872b22723a2", "photo-1676246811449-186a3f77f248",
        "photo-1676246821765-5d81a2a2ca14", "photo-1676247158228-77f0c62ceb9a",
        "photo-1558981359-219d6364c9c8", "photo-1558981852-426c6c22a060",
        "photo-1547549082-6bc09f2049ae", "photo-1622185135505-2d795003994a",
        "photo-1558980664-769d59546b3d", "photo-1558981285-6f0c94958bb6",
    ],
    "Skin Care": [
        "photo-1556228578-0d85b1a4d571", "photo-1563170351-be82bc888aa4",
        "photo-1598440947619-2c35fc9aa908", "photo-1570172619644-dfd03ed5d881",
        "photo-1556228720-195a672e8a03", "photo-1590393802688-ab3fd16d00f3",
        "photo-1612817159949-195b6eb9e31a", "photo-1611080626919-7cf5a9dbab5b",
        "photo-1585652757146-e9d00bf2810c", "photo-1585652757173-57de5e9fab42",
        "photo-1585652757141-8837d676fac8", "photo-1643379850623-7eb6442cd262",
        "photo-1643379850274-77d2e3703ef9", "photo-1586212653598-40f9046fe5e3",
        "photo-1643379852776-308d9bbf8645", "photo-1556228841-a3c527ebefe5",
        "photo-1570194065650-d99fb4bedf0a", "photo-1611930022073-b7a4ba5fcccd",
        "photo-1612817288484-6f916006741a", "photo-1573461160327-b450ce3d8e7f",
    ],
    "Sports Accessories": [
        "photo-1579952363873-f4e3c1c54983", "photo-1535131749006-b7f58c99034b",
        "photo-1461896836934-bd45ba77c9d3", "photo-1517649763962-0c623066013b",
        "photo-1587280501635-68a0e82cd5ff", "photo-1526676037777-05a232554f77",
        "photo-1535131749006-b7f58c99034b", "photo-1556909114-f6e7ad7d3136",
        "photo-1658856507056-24ba67502b1d", "photo-1618073193718-23a66109f4e6",
        "photo-1571019614242-c5c5dee9f50b", "photo-1552674605-db6ffd4facb5",
        "photo-1587116861955-e28f5172e175", "photo-1530549387789-4c1017266635",
        "photo-1517344884509-a0c97ec11bcc", "photo-1487956382158-bb926046304a",
        "photo-1574629810360-7efbbe195018", "photo-1599058917765-a780eda07a3e",
        "photo-1517466787929-bc90951d0974", "photo-1610890716171-6b1bb98ffd09",
    ],
    "Sunglasses": [
        "photo-1572635196237-14b3f281503f", "photo-1556306535-0f09a537f0a3",
        "photo-1508296695146-257a814070b4", "photo-1473496169904-658ba7c44d8a",
        "photo-1511499767150-a48a237f0083", "photo-1574258495973-f010dfbb5371",
        "photo-1509695507497-903c140c43b0", "photo-1577803645773-f96470509666",
        "photo-1681147768015-c6d3702f5e4f", "photo-1662091131946-338d213f4a39",
        "photo-1671960610018-f2fdebbe5b47", "photo-1574258495973-f010dfbb5371",
        "photo-1511499767150-a48a237f0083", "photo-1556306535-0f09a537f0a3",
        "photo-1625591339971-4c9a87a66871", "photo-1612903503645-206e4cfabd23",
        "photo-1575867001167-801a5c3a6e7d", "photo-1584036553516-bf83210aa16c",
        "photo-1564414966614-1e2e5f59c4a8", "photo-1625912530444-76e3cca1ae8a",
    ],
    "Tablets": [
        "photo-1544244015-0df4b3ffc6b0", "photo-1585790050230-5ab715a42f0e",
        "photo-1561154464-82e9adf32764", "photo-1574507926668-26e97fb1041f",
        "photo-1602980760473-5160c97b0cdb", "photo-1544244015-0df4b3ffc6b0",
        "photo-1585790050230-5ab715a42f0e", "photo-1587033411391-5d9e51cce126",
        "photo-1628866971124-5b89351aff97", "photo-1607363775624-81f3f279d9ec",
        "photo-1649151139875-ae8ea07082e2", "photo-1551204570-a10966726988",
        "photo-1579010343429-fe32040146a5", "photo-1627372129933-9abc19b91f21",
        "photo-1589739900243-4b52cd9b104e", "photo-1542751110-97427bbecf20",
        "photo-1611532736597-de2d4265fba3", "photo-1632882765546-1ee75f53becb",
        "photo-1585771724684-38269d6639fd", "photo-1606768666853-403c90a981ad",
    ],
    "Tops": [
        "photo-1562157873-818bc0726f68", "photo-1503342217505-b0a15ec515c3",
        "photo-1525507119028-ed4c629a60a3", "photo-1564859228273-274232fdb516",
        "photo-1434389677669-e08b4cda3a05", "photo-1469334031218-e382a71b716b",
        "photo-1558171813-4c088753af8f", "photo-1515886657613-9f3515b0c78f",
        "photo-1563540153332-29de4b355f49", "photo-1603914579990-df79451fe9b1",
        "photo-1599662875272-64de8289f6d8", "photo-1557771551-634f8d68b0a5",
        "photo-1619794724492-651397287d94", "photo-1664894626626-65ab49e0077d",
        "photo-1467043237213-65f2da53396f", "photo-1565084888279-aca607ecce0c",
        "photo-1591047139829-d91aecb6caea", "photo-1551488831-00ddcb6c6bd3",
        "photo-1562572159-4efc207f5aff", "photo-1496747611176-843222e1e57c",
    ],
    "Vehicle": [
        "photo-1494976388531-d1058494cdd8", "photo-1503376780353-7e6692767b70",
        "photo-1492144534655-ae79c964c9d7", "photo-1544636331-e26879cd4d9b",
        "photo-1553440569-bcc63803a83d", "photo-1552519507-da3b142c6e3d",
        "photo-1525609004556-c46c3653e6e7", "photo-1542282088-72c9c27ed0c5",
        "photo-1591527952582-a2b49e5e0e9e", "photo-1691425649439-f265198a05c8",
        "photo-1662386752917-2c63f23ac578", "photo-1591527952582-3a775d9c0aff",
        "photo-1558981285-6f0c94958bb6", "photo-1494976388531-d1058494cdd8",
        "photo-1533473359331-2f218b12c61b", "photo-1503736334956-4c8f8e92946d",
        "photo-1542362567-b07e54358753", "photo-1549317661-bd32c8ce0aba",
        "photo-1568605117036-5fe5e7bab0b7", "photo-1583121274602-3e2820c69888",
    ],
    "Womens Bags": [
        "photo-1548036328-c9fa89d128fa", "photo-1584917865442-de89df76afd3",
        "photo-1566150905458-1bf1fc113f0d", "photo-1590874103328-eac38ef882c4",
        "photo-1614179689702-355944cd0918", "photo-1622560480605-d83c853bc5c3",
        "photo-1591561954557-26941169b49e", "photo-1590739225287-bd31519780e3",
        "photo-1591348278863-a8fb3887e2aa", "photo-1554632084-1dcbc408d11d",
        "photo-1553845757-677a58d78127", "photo-1583791031288-d48c4326d5da",
        "photo-1585856331820-bed704ef4f76", "photo-1594223274512-ad4803739b7c",
        "photo-1584917865442-de89df76afd3", "photo-1548036328-c9fa89d128fa",
        "photo-1614179689702-355944cd0918", "photo-1584917865442-de89df76afd3",
        "photo-1612902456551-404b8e367d8d", "photo-1575032617751-6ddec2089882",
    ],
    "Womens Dresses": [
        "photo-1496747611176-843222e1e57c", "photo-1572804013309-59a88b7e92f1",
        "photo-1595777457583-95e059d581b8", "photo-1612336307429-8a898d10e223",
        "photo-1515372039744-b8f02a3ae446", "photo-1539008835657-9e8e9680c956",
        "photo-1614251056798-0a63eda2bb25", "photo-1618932260643-eee4a2f652a6",
        "photo-1563540153332-29de4b355f49", "photo-1603914579990-df79451fe9b1",
        "photo-1599662875272-64de8289f6d8", "photo-1557771551-634f8d68b0a5",
        "photo-1619794724492-651397287d94", "photo-1664894626626-65ab49e0077d",
        "photo-1583496661160-fb5886a773a8", "photo-1571513722275-4b41940f54b8",
        "photo-1566174053879-31528523f8ae", "photo-1559034750-cdab70a66b8e",
        "photo-1595777457583-95e059d581b8", "photo-1612336307429-8a898d10e223",
    ],
    "Womens Jewellery": [
        "photo-1535632066927-ab7c9ab60908", "photo-1599643478518-a784e5dc4c8f",
        "photo-1573408301185-9146fe634ad0", "photo-1515562141589-67f0d94a5ff3",
        "photo-1535632787350-4e68ef0ac584", "photo-1543294001-f7cd5d7fb516",
        "photo-1602751584552-8ba73aad10e1", "photo-1605100804763-247f67b3557e",
        "photo-1617658946816-d35c3adc3835", "photo-1625792508300-0e1f913a3a50",
        "photo-1629212093109-354efe3fc541", "photo-1611107683227-e9060eccd846",
        "photo-1515562141589-67f0d94a5ff3", "photo-1573408301185-9146fe634ad0",
        "photo-1506630448388-4e683c67ddb0", "photo-1611591437281-460bfbe1220a",
        "photo-1599643477877-530eb83abc8e", "photo-1603561596112-0a132b757442",
        "photo-1596944924616-7b38e7cfac36", "photo-1588444837495-c6cfeb53f32d",
    ],
    "Womens Shoes": [
        "photo-1543163521-1bf539c55dd2", "photo-1518049362265-d5b2a6467637",
        "photo-1560343090-f0409e92791a", "photo-1606107557195-0e29a4b5b4aa",
        "photo-1560769629-975ec94e6a86", "photo-1584735175315-9d5df23860e6",
        "photo-1595950653106-6c9ebd614d3a", "photo-1575537302964-96cd47c06b1b",
        "photo-1621996659490-3275b4d0d951", "photo-1534653299134-96a171b61581",
        "photo-1553808373-b2c5b7ddb117", "photo-1553028826-7c442e636161",
        "photo-1539722833765-af2db79db72d", "photo-1574413230119-f302e1c9035d",
        "photo-1576503943963-f5f5ca8c6e7c", "photo-1543508282-6319a3e2621f",
        "photo-1515347619252-60a4bf4fff4f", "photo-1575863438850-fb49e0118e00",
        "photo-1587563871167-1ee9c731aefb", "photo-1598107138457-61ebdd1b0571",
    ],
    "Womens Watches": [
        "photo-1522312346375-d1a52e2b99b3", "photo-1524592094714-0f0654e20314",
        "photo-1523275335684-37898b6baf30", "photo-1508057198894-247b23fe5ade",
        "photo-1522312346375-d1a52e2b99b3", "photo-1524592094714-0f0654e20314",
        "photo-1509941943733-f1738dbbc4c2", "photo-1612817159949-195b6eb9e31a",
        "photo-1607776933951-a39fef9e8c35", "photo-1607776905497-b4f788205f6a",
        "photo-1607776931376-f5f5ff1ec0fb", "photo-1639564879163-a2a85682410e",
        "photo-1636289026470-cb40ece1ebc3", "photo-1623052946389-f29990070f71",
        "photo-1612177343582-665b93b34403", "photo-1636639821444-479368c96514",
        "photo-1533139502658-0198f920d8e8", "photo-1526045431048-f857369baa09",
        "photo-1509048191080-d2984bad6ae5", "photo-1539874754764-5a96559165b0",
    ],
}


def main():
    conn = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", 5432),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )
    cur = conn.cursor()

    total_updated = 0

    for category, photo_ids in CATEGORY_IMAGES.items():
        # Deduplicate while preserving order
        seen = set()
        unique_ids = []
        for pid in photo_ids:
            if pid not in seen:
                seen.add(pid)
                unique_ids.append(pid)

        # Build full URLs
        urls = [url(pid) for pid in unique_ids]

        # Get all products in this category ordered by productId for determinism
        cur.execute(
            'SELECT "productId" FROM bedrock_integration.product_catalog '
            "WHERE category_name = %s ORDER BY \"productId\"",
            (category,),
        )
        product_ids = [r[0] for r in cur.fetchall()]

        if not product_ids:
            print(f"  SKIP {category}: no products found")
            continue

        # Assign images evenly (cycle through the pool)
        for i, pid in enumerate(product_ids):
            img_url = urls[i % len(urls)]
            cur.execute(
                'UPDATE bedrock_integration.product_catalog SET "imgUrl" = %s WHERE "productId" = %s',
                (img_url, pid),
            )

        total_updated += len(product_ids)
        print(f"  {category}: {len(product_ids)} products -> {len(urls)} unique images")

    conn.commit()
    conn.close()

    print(f"\nDone! Updated {total_updated} products across {len(CATEGORY_IMAGES)} categories.")

    # Verify
    conn = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", 5432),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )
    cur = conn.cursor()
    cur.execute(
        "SELECT category_name, COUNT(DISTINCT \"imgUrl\") as unique_imgs "
        "FROM bedrock_integration.product_catalog GROUP BY category_name ORDER BY category_name"
    )
    print("\nVerification — unique images per category:")
    for cat, unique in cur.fetchall():
        print(f"  {cat}: {unique}")
    conn.close()


if __name__ == "__main__":
    main()
