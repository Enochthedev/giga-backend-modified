# Shop Model Documentation
---------------------------------------------------------------------------------------------------
## Product Model README

## Overview

This README provides an explanation of the `Product` model, a Mongoose schema representing products for an online marketplace. It describes the model's fields, usage, and how to handle product reviews.

## Product Model Fields

The `Product` model includes the following fields:

- **vendor:** ID of the product vendor.
- **shop:** ID of the shop where the product is sold.
- **productName:** Name of the product.
- **normalizedProductName:** Normalized product name used for search and indexing.
- **productDescription:** Description of the product.
- **productCategory:** Category of the product.
- **productSubCategory:** Subcategory of the product.
- **productImages:** Array of URLs to images of the product.
- **productPrice:** Price of the product.
- **productAmountInStock:** Number of units of the product in stock.
- **productRating:** Average rating of the product based on customer reviews.
- **productFulfilmentTime:** Estimated time to fulfill an order for this product.
- **productReviews:** Array of review IDs for the product.

## Usage

To utilize the `Product` model in your application, follow these steps:

1. **Import the Product Model:**

   ```javascript
   import Product from './models/Product';
   ```

2. **Creating and Saving a Product:**

   ```javascript
   const product = new Product({
     // ... (provide product details)
   });

   await product.save();
   ```

3. **Retrieving a Product:**

   ```javascript
   const product = await Product.findById('<product_id>');
   ```

4. **Modifying Product Details:**

   ```javascript
   product.productName = 'New Product Name';
   await product.save();
   ```

5. **Querying for Products:**

   ```javascript
   const products = await Product.find({ productCategory: 'Clothing' });
   ```

## Product Reviews

The `productReviews` field in the `Product` model allows you to associate product reviews with products. This aids in displaying reviews on product pages and calculating product ratings.

- **Associating a Review:**

  ```javascript
  const product = await Product.findById('<product_id>');
  product.productReviews.push('<review_id>');
  await product.save();
  ```

- **Retrieving Reviews:**

  ```javascript
  const product = await Product.findById('<product_id>');
  const reviews = await Product.find({ _id: { $in: product.productReviews } });
  ```

The `Product` model offers a convenient way to manage product data in your online marketplace. Feel free to use and adapt this model to suit your specific requirements.
--------------------------------------------------------------------------
## order Model Documentation



---------------------------------------------------------------------------------------------------

## review Model Documentation
