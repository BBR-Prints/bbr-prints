# Deploy And Live Product Editing

This site is now set up for Netlify + GitHub + Decap CMS.

Customers visit the normal site. You edit products at:

```text
https://your-site.netlify.app/admin/
```

## What You Need

1. A GitHub account.
2. A Netlify account.
3. This site connected to GitHub, then deployed by Netlify.
4. Netlify Identity enabled.
5. Netlify Git Gateway enabled.

## First Deploy

1. Put this folder in a GitHub repository.
2. In Netlify, choose `Add new site` and connect that GitHub repo.
3. Use no build command.
4. Use `/` as the publish directory.
5. Deploy the site.

## Enable Admin Login

In Netlify:

1. Open the site dashboard.
2. Go to `Identity` and enable Identity.
3. Go to `Identity > Services` and enable Git Gateway.
4. Invite yourself as a user.
5. Accept the invite from your email.
6. Open `/admin/` on your site and log in.

## Adding Products Live

1. Go to `/admin/`.
2. Open `Shop Catalog`.
3. Edit the product list.
4. Upload product photos in the image field.
5. Paste Stripe Payment Links when available.
6. Click publish.

Decap CMS commits the change to GitHub. Netlify rebuilds the site automatically, so customers see the updated products after the deploy finishes.

## Payments

Stripe payments still use Stripe Payment Links. Create one link per product in Stripe and paste it into the product's `paymentLink` field.

## Email

Replace `OWNER_EMAIL` in `app.js` with your real email before publishing, so custom order and email requests go to you.
