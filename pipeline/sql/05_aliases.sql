-- The alias bridge: every name an entity has been known by, with the window the
-- source states for it and the evidence behind that window.
--
-- Three properties of this table shape how the site uses it, and all three are
-- measured rather than assumed:
--
--   * 1,495 of the 3,791 rows repeat the entity's own current name. They are kept,
--     because a typed current name has to resolve like any other, and filtered out
--     when a page lists the names an entity played under.
--   * Only 1,816 rows carry a window. A row without one is a wiki redirect: worth
--     matching in search, wrong to print on a page that would otherwise become a
--     thesaurus of every spelling the wiki ever used.
--   * Alias strings are not unique within a kind: "APA" names both the player APA
--     and the player Frozen. Resolution therefore returns a list, never a single
--     match, and the caller has to decide what to do with more than one.
create or replace view alias_rows as
select
  kind,
  alias_string,
  entity_id,
  entity_name,
  cast(valid_from as varchar) as valid_from,
  cast(valid_to as varchar)   as valid_to,
  evidence
from read_csv('data/model/bridge_alias.csv', header = true);
