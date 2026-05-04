const db = require("../models/db");

// GET / — Landing page
exports.getLanding = (req, res) => {
  res.render("index");
};

// GET /add — Add product form
exports.getAddProduct = (req, res) => {
  res.render("add", { error: null });
};

// POST /add — Save new product + variants
exports.postAddProduct = async (req, res) => {
  const { productName, sizes, quantities } = req.body;

  // Validation
  if (!productName || productName.trim() === "") {
    return res.render("add", { error: "Product name is required." });
  }

  const sizesArr = Array.isArray(sizes) ? sizes : sizes ? [sizes] : [];
  const quantitiesArr = Array.isArray(quantities)
    ? quantities
    : quantities
      ? [quantities]
      : [];

  if (sizesArr.length === 0) {
    return res.render("add", { error: "At least one variant is required." });
  }

  // Filter valid pairs
  const validVariants = [];
  for (let i = 0; i < sizesArr.length; i++) {
    const size = parseFloat(sizesArr[i]);
    const qty = parseInt(quantitiesArr[i], 10);
    if (!isNaN(size) && !isNaN(qty) && qty >= 1) {
      validVariants.push({ size, qty });
    }
  }

  if (validVariants.length === 0) {
    return res.render("add", {
      error: "Please add at least one valid variant with quantity ≥ 1.",
    });
  }

  // Check for duplicate sizes
  const sizeSet = new Set(validVariants.map((v) => v.size));
  if (sizeSet.size !== validVariants.length) {
    return res.render("add", {
      error: "Duplicate sizes are not allowed. Each size must be unique.",
    });
  }

  try {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      const [productResult] = await conn.execute(
        "INSERT INTO products (name) VALUES (?)",
        [productName.trim()],
      );
      const productId = productResult.insertId;

      for (const v of validVariants) {
        await conn.execute(
          "INSERT INTO variants (product_id, size, quantity) VALUES (?, ?, ?)",
          [productId, v.size, v.qty],
        );
      }

      await conn.commit();
      conn.release();
      res.redirect("/products");
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.render("add", { error: "Failed to save product. Please try again." });
  }
};

// GET /products — List all products
exports.getProducts = async (req, res) => {
  const search = req.query.search || "";

  try {
    let query = `
      SELECT p.id, p.name, p.created_at,
             COUNT(v.id) AS variant_count,
             COALESCE(SUM(v.quantity), 0) AS total_stock
      FROM products p
      LEFT JOIN variants v ON v.product_id = p.id
    `;
    const params = [];

    if (search.trim()) {
      query += " WHERE p.name LIKE ?";
      params.push(`%${search.trim()}%`);
    }

    query += " GROUP BY p.id ORDER BY p.created_at DESC";

    const [products] = await db.execute(query, params);
    res.render("products", { products, search });
  } catch (err) {
    console.error(err);
    res.render("products", {
      products: [],
      search,
      error: "Failed to load products.",
    });
  }
};

// GET /product/:id — Product detail
exports.getProductDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const [[product]] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );

    if (!product) {
      return res.redirect("/products");
    }

    const [variants] = await db.execute(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY size ASC",
      [id],
    );

    const totalStock = variants.reduce((sum, v) => sum + v.quantity, 0);
    res.render("product", { product, variants, totalStock });
  } catch (err) {
    console.error(err);
    res.redirect("/products");
  }
};

// GET /edit/:id — Edit product form
exports.getEditProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const [[product]] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );

    if (!product) {
      return res.redirect("/products");
    }

    const [variants] = await db.execute(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY size ASC",
      [id],
    );

    res.render("edit", { product, variants, error: null });
  } catch (err) {
    console.error(err);
    res.redirect("/products");
  }
};

// POST /edit/:id — Update product + variants
exports.postEditProduct = async (req, res) => {
  const { id } = req.params;
  const { productName, sizes, quantities } = req.body;

  if (!productName || productName.trim() === "") {
    const [[product]] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );
    const [variants] = await db.execute(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY size ASC",
      [id],
    );
    return res.render("edit", {
      product,
      variants,
      error: "Product name is required.",
    });
  }

  const sizesArr = Array.isArray(sizes) ? sizes : sizes ? [sizes] : [];
  const quantitiesArr = Array.isArray(quantities)
    ? quantities
    : quantities
      ? [quantities]
      : [];

  const validVariants = [];
  for (let i = 0; i < sizesArr.length; i++) {
    const size = parseFloat(sizesArr[i]);
    const qty = parseInt(quantitiesArr[i], 10);
    if (!isNaN(size) && !isNaN(qty) && qty >= 1) {
      validVariants.push({ size, qty });
    }
  }

  if (validVariants.length === 0) {
    const [[product]] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );
    const [variants] = await db.execute(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY size ASC",
      [id],
    );
    return res.render("edit", {
      product,
      variants,
      error: "At least one valid variant is required.",
    });
  }

  const sizeSet = new Set(validVariants.map((v) => v.size));
  if (sizeSet.size !== validVariants.length) {
    const [[product]] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );
    const [variants] = await db.execute(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY size ASC",
      [id],
    );
    return res.render("edit", {
      product,
      variants,
      error: "Duplicate sizes are not allowed.",
    });
  }

  try {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      await conn.execute("UPDATE products SET name = ? WHERE id = ?", [
        productName.trim(),
        id,
      ]);
      await conn.execute("DELETE FROM variants WHERE product_id = ?", [id]);

      for (const v of validVariants) {
        await conn.execute(
          "INSERT INTO variants (product_id, size, quantity) VALUES (?, ?, ?)",
          [id, v.size, v.qty],
        );
      }

      await conn.commit();
      conn.release();
      res.redirect(`/product/${id}`);
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error(err);
    const [[product]] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );
    const [variants] = await db.execute(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY size ASC",
      [id],
    );
    res.render("edit", {
      product,
      variants,
      error: "Failed to update product. Please try again.",
    });
  }
};

// POST /delete/:id — Delete product
exports.postDeleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    // Cascade delete handles variants via FK constraint
    await db.execute("DELETE FROM products WHERE id = ?", [id]);
    res.redirect("/products");
  } catch (err) {
    console.error(err);
    res.redirect("/products");
  }
};
