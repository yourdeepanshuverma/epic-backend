import slugify from "slugify";

async function generateUniqueSlug(name, id) {
  let baseSlug = slugify(name, { lower: true, strict: true, trim: true });
  let slug = `${baseSlug}-${id}`;

  return slug;
}

export default generateUniqueSlug;
