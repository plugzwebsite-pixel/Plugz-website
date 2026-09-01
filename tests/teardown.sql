-- Everything the release suite creates carries an rt marker, so this finds all
-- of it by pattern and nothing else by accident. Run it and the database is
-- back where it started.
--
-- Ordered so a row is never orphaned: what points at something goes before the
-- thing it points at, except where a cascade already handles it.

delete from "Dispute" d using "Sale" s
 where d."saleId" = s.id and (s.id like 'rt%' or s."orderRef" like 'RT%');

delete from "Sale" where id like 'rt%' or "orderRef" like 'RT%';

delete from "Click" c using "TrackingLink" t
 where c."trackingLinkId" = t.id and t.id like 'rt%';

delete from "Click" c using "TrackingLink" t, "CreatorProduct" cp, "CreatorProfile" pr
 where c."trackingLinkId" = t.id and t."creatorProductId" = cp.id
   and cp."profileId" = pr.id and pr.handle like 'rt%';

delete from "ProductView" v using "CreatorProduct" cp, "CreatorProfile" pr
 where v."creatorProductId" = cp.id and cp."profileId" = pr.id and pr.handle like 'rt%';

delete from "CampaignListing" cl using "Campaign" c
 where cl."campaignId" = c.id and c.name like 'RT %';
delete from "CampaignCreator" cc using "Campaign" c
 where cc."campaignId" = c.id and c.name like 'RT %';
delete from "Campaign" where name like 'RT %';

delete from "CommissionOverride" o using "Brand" b
 where o."brandId" = b.id and b.name like 'RT %';
delete from "CommissionOverride" o using "CreatorProfile" p
 where o."creatorProfileId" = p.id and p.handle like 'rt%';

delete from "ReturnWindowOverride" r using "Brand" b
 where r."brandId" = b.id and b.name like 'RT %';

delete from "BrandInvoice" bi using "Brand" b
 where bi."brandId" = b.id and b.name like 'RT %';

delete from "Payout" po using "CreatorProfile" p
 where po."profileId" = p.id and p.handle like 'rt%';

-- Brand cascades to its products, their listings and their tracking links.
delete from "Brand" where name like 'RT %';

-- User cascades to creator profile, shopper profile, wishlist and tokens.
delete from "User" where email like 'rt%@pluggz.test';

delete from "Category" where name like 'RT Probe Category%';
delete from "SiteContent" where key = 'heroTitle';
delete from "BrandEnquiry" where "contactEmail" like 'rt%@pluggz.test';

-- What is left, if anything. Every one of these should read zero.
select 'users'      as thing, count(*) from "User"           where email like 'rt%@pluggz.test'
union all select 'creators',   count(*) from "CreatorProfile" where handle like 'rt%'
union all select 'brands',     count(*) from "Brand"          where name like 'RT %'
union all select 'products',   count(*) from "Product"        where name like 'RT %'
union all select 'listings',   count(*) from "CreatorProduct" cp
            where exists (select 1 from "CreatorProfile" pr
                           where pr.id = cp."profileId" and pr.handle like 'rt%')
union all select 'categories', count(*) from "Category"       where name like 'RT %'
union all select 'campaigns',  count(*) from "Campaign"       where name like 'RT %'
union all select 'enquiries',  count(*) from "BrandEnquiry"   where "contactEmail" like 'rt%@pluggz.test';
