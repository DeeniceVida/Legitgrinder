---
description: How to deploy and secure your Paystack payment verification system
---

Since the Supabase CLI is restricted on this environment, you can manually deploy the secure verification layer through your Supabase Dashboard. Follow these steps precisely:

### Step 1: Create the Edge Function
1. Log in to your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project: `okfrcfgcnjkindwbquic`.
3. In the left sidebar, click on **Edge Functions** (the code bracket icon `< >`).
4. Click **Create a new function**.
5. Name it exactly: `verify-paystack`.
6. Open your local file: [index.ts](file:///c:/Users/ADMIN/Downloads/copy-of-legitgrinder%20(2)/supabase/functions/verify-paystack/index.ts).
7. Copy ALL the code from your local `index.ts` and paste it into the Supabase online editor, replacing everything.
8. Click **Deploy** (top right).

### Step 2: Secure Your "Golden Key" (Secret Key)
This step ensures your Secret Key is hidden from the public and only accessible to the backend.
1. In the Supabase Dashboard, go to **Project Settings** (gear icon at the bottom).
2. Click on **Edge Functions** under the "Settings" section.
3. Look for the **Environment Variables** section.
4. Click **Add new**.
5. **Name**: `PAYSTACK_SECRET_KEY`
6. **Value**: `sk_test_2c7fc1722ad0a08d303e772e201b67e201b187a869` (Use the test key first as we discussed).
7. Click **Save**.

### Step 3: Deployment Verification
1. Once deployed, the dashboard will show a **Function URL**.
2. It should look like: `https://okfrcfgcnjkindwbquic.supabase.co/functions/v1/verify-paystack`.
3. If this matches, your frontend code in `Shop.tsx` will automatically start communicating with it.

### Step 4: Final Test
1. Open your website.
2. Go to the **Shop**.
3. Select an item and click **Initialize Checkout**.
4. Pay using the **Test Card** provided by the Paystack popup.
5. If successful, you should see the alert: *"Secure Payment Verified!"*.

> [!TIP]
> **Going Live**: To switch to live payments later, simply update the `PAYSTACK_SECRET_KEY` in Step 2 with your **Live Secret Key** (sk_live...) and update the `VITE_PAYSTACK_PUBLIC_KEY` in your `.env.local` to the **Live Public Key** (pk_live...).