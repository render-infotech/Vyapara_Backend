CREATE DATABASE vyapara;

-- Created new table for all the users - by Shubham
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID of the users',
  `first_name` VARCHAR(50) NOT NULL COMMENT 'The first name of the user',
  `middle_name` VARCHAR(50) DEFAULT NULL COMMENT 'The middle name of the user',
  `last_name` VARCHAR(50) DEFAULT NULL COMMENT 'The last name of the user',
  `profile_pic` TEXT DEFAULT NULL COMMENT 'The profile pic URL',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email ID of the user',
  `password` VARCHAR(255) DEFAULT NULL COMMENT 'Password of the user',
  `phone_country_code` VARCHAR(10) DEFAULT NULL COMMENT 'The phone country code (IN, US, etc)',
  `phone_code` VARCHAR(10) DEFAULT NULL COMMENT 'The phone code of the phone country',
  `phone` VARCHAR(15) NOT NULL COMMENT 'The phone number of the user',
  `dob` VARCHAR(30) DEFAULT NULL COMMENT 'Date of birth of the user',
  `gender` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Gender of the user (1 = Male, 2 = Female, 3 = Others)',
  `role_id` BIGINT NOT NULL DEFAULT 10 COMMENT 'Role ID (1=Admin, 2=Vendor, 3=Rider, 10=End User, etc)',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Is the user Active or Not',
  `two_factor_enabled` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether the user has enabled Two-Factor Authentication',
  `is_deactivated` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'To mark if user is deactivated',
  `user_verified` TINYINT(1) DEFAULT 0 COMMENT 'Has the user KYC verified',
  `password_change_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time, when the password was last changed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time, when the records were created',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date and time, when the records were updated',
  PRIMARY KEY (`id`),
  KEY `user_first_name` (`first_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Users list table';


-- Created new table for user details - by Shubham
CREATE TABLE IF NOT EXISTS `customer_details` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary ID of the customer details record(unique for one-to-one relation)',
  `customer_id` BIGINT NOT NULL UNIQUE COMMENT 'Reference to the user this record belongs to',
    `customer_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique formatted customer code (e.g., CUS100001)',
  `nominee_name` VARCHAR(100) DEFAULT NULL COMMENT 'Full name of the nominee',
  `nominee_phone_country_code` VARCHAR(10) DEFAULT NULL COMMENT 'The phone country code of the nominee (IN, US, etc)',
  `nominee_phone_code` VARCHAR(10) DEFAULT NULL COMMENT 'The phone code of the nominee’s country',
  `nominee_phone` VARCHAR(15) DEFAULT NULL COMMENT 'The phone number of the nominee',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_customer_details_user`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
COMMENT='Stores additional personal and nominee details of customers';


-- Created new table for customer address details - by Shubham
CREATE TABLE IF NOT EXISTS `customer_address` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary ID of the address record',
  `customer_id` BIGINT NOT NULL COMMENT 'Reference to the customer/user ID',
  `full_name` VARCHAR(100) NOT NULL COMMENT 'Full name of the receiver',
  `phone_country_code` VARCHAR(10) DEFAULT NULL COMMENT 'Phone country code (IN, US, etc)',
  `phone_code` VARCHAR(10) DEFAULT NULL COMMENT 'Dialing code (+91, +1, etc)',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT 'Contact number for this address',
  `country` VARCHAR(100) NOT NULL COMMENT 'Country name',
  `state` VARCHAR(100) NOT NULL COMMENT 'State or province name',
  `city` VARCHAR(100) NOT NULL COMMENT 'City name',
  `address_line_1` VARCHAR(255) NOT NULL COMMENT 'Primary address line',
  `address_line_2` VARCHAR(255) DEFAULT NULL COMMENT 'Secondary address line',
  `landmark` VARCHAR(255) DEFAULT NULL COMMENT 'Nearby landmark for easier delivery',
  `pincode` VARCHAR(15) DEFAULT NULL COMMENT 'Postal or ZIP code',
  `geo_location` VARCHAR(255) DEFAULT NULL COMMENT 'Readable location or map link',
  `address_type` VARCHAR(50) DEFAULT 'Home' COMMENT 'Address type (Home, Work, Other)',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Marks this as the default address for the user',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active (1) or Inactive (0)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_customer_address_user`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
COMMENT='Stores all saved addresses of customers (Home, Work, etc)';


-- Created new table for vendor details - by Shubham
CREATE TABLE IF NOT EXISTS `vendor_details` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary ID of the vendor details record',
  `vendor_id` BIGINT NOT NULL UNIQUE COMMENT 'Reference to the user this vendor belongs to',
  `vendor_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique code of the vendor, auto-generated',
  `business_name` VARCHAR(150) DEFAULT NULL COMMENT 'Business name of the vendor',
  `address_line` TEXT DEFAULT NULL COMMENT 'Street address or shop location',
  `country` VARCHAR(100) NOT NULL COMMENT 'Country name of the vendor',
  `state` VARCHAR(100) NOT NULL COMMENT 'State name of the vendor',
  `city` VARCHAR(100) NOT NULL COMMENT 'City name of the vendor',
  `pincode` VARCHAR(15) DEFAULT NULL COMMENT 'Postal/ZIP code of the vendor',
  `gst_number` VARCHAR(50) DEFAULT NULL COMMENT 'GST number if applicable',
  `is_gst_registered` TINYINT DEFAULT 0 COMMENT '1 if GST registered, else 0',
  `website` VARCHAR(150) DEFAULT NULL COMMENT 'Official website URL of the vendor',
  `description` TEXT DEFAULT NULL COMMENT 'Description or about section of the vendor',
  `materials` JSON DEFAULT NULL COMMENT 'List of materials vendor deals in',
  `payment_modes` JSON DEFAULT NULL COMMENT 'Accepted payment modes, e.g. ["UPI","Cash","Credit Card"]',
  `working_hours` JSON DEFAULT NULL COMMENT 'Vendor working hours',
  `rating` DECIMAL(3,2) DEFAULT 0.0 COMMENT 'Average rating of the vendor',
  `review_count` INT DEFAULT 0 COMMENT 'Total number of reviews',
  `geo_location` VARCHAR(255) DEFAULT NULL COMMENT 'Readable location or map link',
  `is_complete` TINYINT DEFAULT 1 COMMENT 'If the profile steps completed by Admin, so it can be listed for operations',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when record was created',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date and time when record was last updated',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_vendor_details_user`
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Stores detailed information about vendors';

-- Created new table to add live price by admin - by Shubham
CREATE TABLE IF NOT EXISTS `material_rate` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the metal rate',
  `material_id` INT NOT NULL COMMENT 'Material type (1 = Gold, 2 = Silver)',
  `price_per_gram` DECIMAL(15,2) NOT NULL COMMENT 'Metal price per gram',
  `change_percentage` DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Percentage change compared to previous latest price',
  `is_latest` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Flag to mark latest entry per material_id',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive',
  `remarks` TEXT DEFAULT NULL COMMENT 'Admin remarks or notes about the price update',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  INDEX `idx_material_latest` (`material_id`, `is_latest`)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COMMENT='Stores gold/silver metal price per gram with change history tracking';


-- Created new table to add dynamic tax precentage by admin - by Shubham
CREATE TABLE IF NOT EXISTS `tax_rate` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the tax rate',
  `material_id` INT NOT NULL COMMENT 'Material reference (1 = Gold, 2 = Silver)',
  `tax_type` INT NOT NULL DEFAULT 1 COMMENT 'Tax type reference (1 = GST, etc)',
  `tax_percentage` DECIMAL(6,2) NOT NULL COMMENT 'Applied tax rate percentage',
  `tax_on` INT NOT NULL COMMENT 'What this tax applies to (1 = Material, 2 = Service_fee)',
  `is_latest` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Marks latest tax entry for material + tax name + tax_on + tax_percentage',
  `effective_date` DATE NOT NULL COMMENT 'Tax effective start date',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT 'Is the tax rate active? (1 = Active, 0 = Inactive)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Table for storing tax rates';


-- Created new table to add dynamic service fee rate by admin - by Shubham
CREATE TABLE IF NOT EXISTS `service_fee_rate` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the service fee rate',
  `material_id` INT NOT NULL COMMENT 'Material reference (1 = Gold, 2 = Silver)',
  `service_fee_type` INT NOT NULL DEFAULT 1 COMMENT 'Service fee type reference (1 = convenience fee, etc)',
  `service_fee_rate` DECIMAL(6,2) NOT NULL COMMENT 'Service fee rate (percentage or fixed value)',
  `effective_date` DATE NOT NULL COMMENT 'Service fee applicable from date',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT 'Status (1 = Active, 0 = Inactive)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Table for storing service fee rates';


-- Created new table for digital purchases - by Shubham
CREATE TABLE IF NOT EXISTS `digital_purchase` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the purchase',
  `customer_id` BIGINT NOT NULL COMMENT 'Foreign key of the customer who made the purchase',
  `transaction_type_id` INT NOT NULL DEFAULT 1 COMMENT 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
  `purchase_code` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique purchase identifier (e.g., DP20251013-001)',
  `material_id` INT NOT NULL COMMENT 'Material type (1 = Gold, 2 = Silver)',
  `amount` DECIMAL(15,2) NOT NULL COMMENT 'Base amount entered by customer (excluding taxes)',
  `price_per_gram` DECIMAL(15,2) NOT NULL COMMENT 'Metal price per gram at purchase time',
  `grams_purchased` DECIMAL(15,6) NOT NULL COMMENT 'Grams calculated = amount / price_per_gram',
  `tax_rate_material` VARCHAR(10) NOT NULL COMMENT 'Tax rate applied on material (e.g. +5%)',
  `tax_amount_material` DECIMAL(15,2) NOT NULL COMMENT 'Tax amount calculated on material',
  `tax_rate_service` VARCHAR(10) NOT NULL COMMENT 'Tax rate applied on service (e.g. +16%)',
  `tax_amount_service` DECIMAL(15,2) NOT NULL COMMENT 'Tax amount calculated on service',
  `total_tax_amount` DECIMAL(15,2) NOT NULL COMMENT 'Total combined tax (material + service)',
  `service_fee_rate` VARCHAR(10) NOT NULL DEFAULT '0.0' COMMENT 'Service fee rate (%) as string',
  `service_fee` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Service fee amount',
  `total_amount` DECIMAL(15,2) NOT NULL COMMENT 'Total amount including tax, commission, and service charge',
  `purchase_status` INT NOT NULL DEFAULT 1 COMMENT 'Purchase status (1 = Pending, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = Refunded)',
  `rate_timestamp` DATETIME NOT NULL COMMENT 'Timestamp when the rate was fetched',
  `remarks` TEXT DEFAULT NULL COMMENT 'Optional remarks or notes about the transaction',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_digital_purchase_user`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
COMMENT='Digital gold/silver purchase records table';


-- Created new table for products - by Shubham
CREATE TABLE IF NOT EXISTS `products` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key of the product',
  `material_id` INT NOT NULL COMMENT '1 = Gold, 2 = Silver',
  `product_name` VARCHAR(200) NOT NULL COMMENT 'Name of the product',
  `weight_in_grams` DECIMAL(10,3) NOT NULL COMMENT 'Weight of the product in grams',
  `purity` VARCHAR(20) NOT NULL DEFAULT '24K' COMMENT '24K, 999, 916',
  `icon` TEXT DEFAULT NULL COMMENT 'The product icon URL',
  `making_charges` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Making charges for the product',
  `description` TEXT DEFAULT NULL COMMENT 'Optional description of the product',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
COMMENT='Products list table';


-- Created new table for digital holdings - by Shubham
CREATE TABLE IF NOT EXISTS `digital_holdings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key of the entry',
  `customer_id` BIGINT NOT NULL COMMENT 'Customer owning this holding entry',
  `material_id` INT NOT NULL COMMENT 'Material type (1 = Gold, 2 = Silver)',
  `purchase_id` BIGINT DEFAULT NULL COMMENT 'Reference to digital purchase (for BUY)',
  `redeem_id` BIGINT DEFAULT NULL COMMENT 'Reference to physical redeem (for REDEEM)',
  `deposit_id` BIGINT DEFAULT NULL COMMENT 'Reference to physical deposit (for DEPOSIT)',
  `transaction_type_id` INT NOT NULL COMMENT 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
  `grams` DECIMAL(15,6) NOT NULL COMMENT 'Positive for buy, negative for redeem',
  `running_total_grams` DECIMAL(15,6) NOT NULL COMMENT 'Updated balance after this entry',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_digital_holdings_user`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_digital_holdings_purchase`
    FOREIGN KEY (`purchase_id`) REFERENCES `digital_purchase`(`id`)
    ON DELETE SET NULL
  CONSTRAINT `fk_digital_holdings_deposit`
    FOREIGN KEY (`deposit_id`) REFERENCES `physical_deposit`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
COMMENT='Unified data for digital gold/silver holdings';

-- Alter new columns for digital purchase- by Afrid
ALTER TABLE digital_purchase
ADD COLUMN razorpay_order_id VARCHAR(255),
ADD COLUMN razorpay_payment_id VARCHAR(255),
ADD COLUMN razorpay_signature VARCHAR(255),
ADD COLUMN payment_status TINYINT DEFAULT 0,
ADD COLUMN webhook_event_id VARCHAR(255);


-- Created new table for physical redeem - by Shubham
CREATE TABLE IF NOT EXISTS `physical_redeem` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the redeem',
  `customer_id` BIGINT NOT NULL COMMENT 'Foreign key of the customer who made the purchase',
  `redeem_code` VARCHAR(100) UNIQUE COMMENT 'Unique redeem identifier (e.g., RD20251013-001)',
  `transaction_type_id` INT NOT NULL DEFAULT 3 COMMENT 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
  `material_id` INT NOT NULL COMMENT 'Material type (1 = Gold, 2 = Silver)',
  `price_per_gram` DECIMAL(15,2) NOT NULL COMMENT 'Metal price per gram at redeem time was initiated',
  `grams_before_redeem` DECIMAL(15,6) NOT NULL COMMENT 'Total grams before redeem request',
  `grams_redeemed` DECIMAL(15,6) NOT NULL COMMENT 'Grams redeemed in this request',
  `grams_after_redeem` DECIMAL(15,6) NOT NULL COMMENT 'Remaining grams after redeem',
  `address_id` BIGINT NOT NULL COMMENT 'Delivery address selected',
  `products` JSON NOT NULL COMMENT 'Array of products with quantity: [{ product_id, quantity }]',
  `admin_status` INT NOT NULL DEFAULT 1 COMMENT 'Admin status: 0=Pending, 1=Approve, 2=Reject',
  `vendor_id` BIGINT NULL COMMENT 'Vendor assigned by admin',
  `vendor_status` INT NULL DEFAULT 0 COMMENT 'Vendor response: 0=Pending, 1=Approve, 2=Reject',
  `rider_id` BIGINT NULL COMMENT 'Rider assigned by vendor',
  `rider_status` INT NULL DEFAULT 0 COMMENT 'Rider status: 0=Pending, 1=Approve, 2=Reject',
  `flow_status` INT NOT NULL DEFAULT 1 COMMENT 'Workflow state',
  `remarks` TEXT NULL COMMENT 'Optional remarks',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',

  PRIMARY KEY (`id`),

  -- Customer & Address FK
  CONSTRAINT `fk_physical_redeem_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_physical_redeem_address`
    FOREIGN KEY (`address_id`) REFERENCES `customer_address`(`id`)
    ON DELETE RESTRICT,

  -- Vendor FK (NEW)
  CONSTRAINT `fk_physical_redeem_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `vendor_details`(`vendor_id`)
    ON DELETE SET NULL
);

-- Created new columns for OTP logs - by Afrid
CREATE TABLE IF NOT EXISTS `otp_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID of the otp log',
  `user_id` bigint NOT NULL COMMENT 'User ID',
  `otp_hash` varchar(255) NOT NULL COMMENT 'Hashed OTP',
  `expires_at` datetime NOT NULL COMMENT 'Expiration time of the OTP',
  `attempts` int NOT NULL DEFAULT '0' COMMENT 'Number of attempts',
  `is_used` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether the OTP has been used',
  `context` varchar(50) NOT NULL COMMENT 'Context of the OTP (e.g., physical_redeem)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the record was created',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `otp_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='OTP Logs table';

-- Created new columns for rider details - by Afrid
CREATE TABLE IF NOT EXISTS `rider_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rider_id` bigint NOT NULL COMMENT 'User ID of the rider',
  `vendor_id` bigint NOT NULL COMMENT 'User ID of the vendor who owns this rider',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1 = Active, 0 = Inactive',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rider_id` (`rider_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `rider_details_ibfk_1` FOREIGN KEY (`rider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `rider_details_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Rider details and vendor association';

-- Alter new columns for physical redeem - by Afrid
ALTER TABLE `physical_redeem` ADD COLUMN `signature` VARCHAR(255) DEFAULT NULL COMMENT 'URL of the delivery signature';


-- Created new table for physical deposit - by Shubham
CREATE TABLE IF NOT EXISTS `physical_deposit` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the deposit request',
  `deposit_code` VARCHAR(50) UNIQUE COMMENT 'Unique deposit reference code (e.g., PD20251209-ABC123)',
  `customer_id` BIGINT NOT NULL COMMENT 'Customer ID who is giving the deposit to vendor',
  `vendor_id` BIGINT NOT NULL COMMENT 'Vendor ID who is recording the deposit',
  `kyc_verified` INT NOT NULL DEFAULT 0 COMMENT '1 = KYC Verified, 0 = Not Verified',
  `vendor_otp_verify` INT DEFAULT 0 COMMENT 'OTP verification for customer, 0 = Pending, 1 = OTP Verified, 2 = Failed',
  `agreed_by_customer` INT NOT NULL DEFAULT 0 COMMENT '0 = Not Agreed, 1 = Agreed',
  `agreed_at` DATETIME NULL COMMENT 'Timestamp when customer and vendor reached agreement',
  `final_summary_otp_verify` INT DEFAULT 0 COMMENT 'OTP verification for summary, 0 = Pending, 1 = OTP Verified, 2 = Failed',
  `total_pure_grams` DECIMAL(15,6) NOT NULL DEFAULT 0 COMMENT 'Total pure grams after purity conversion',
  `price_per_gram` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Live price per gram at time of deposit',
  `estimated_value` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Estimated amount customer will receive',
  `vendor_remarks` TEXT NULL COMMENT 'Vendor remarks (optional)',
  `flow_status` INT NOT NULL DEFAULT 1 COMMENT     'Deposit Flow Status: 1=Vendor Verification Pending, 2=Vendor OTP Verified, 3=Agreement Completed, 4=Final Summary OTP Sent, 5=Final Summary OTP Verified, 10=flow Completed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',

  PRIMARY KEY (`id`),

  CONSTRAINT `fk_physical_deposit_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_physical_deposit_customer_details`
    FOREIGN KEY (`customer_id`) REFERENCES `customer_details`(`customer_id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_physical_deposit_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `vendor_details`(`vendor_id`)
    ON DELETE RESTRICT
);

-- Created new table for physical deposit products - by Shubham
CREATE TABLE IF NOT EXISTS `physical_deposit_products` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of each deposited product item',
  `deposit_id` BIGINT NOT NULL COMMENT 'Reference to main deposits table (foreign key)',
  `product_type` VARCHAR(100) NOT NULL COMMENT 'Type of product (e.g., Ring, Chain, Coin, Bar, Bracelet)',
  `material_id` INT NOT NULL COMMENT 'Material type: 1 = Gold, 2 = Silver (matches material table)',
  `purity` VARCHAR(20) NOT NULL COMMENT 'Purity of the item (e.g., 22K, 916, 999, 18K)',
  `gross_weight` DECIMAL(15,6) NOT NULL COMMENT 'Total item weight including stones or impurities (in grams)',
  `net_weight` DECIMAL(15,6) NOT NULL COMMENT 'Net metal weight after removing stones/wastage (in grams)',
  `pure_metal_equivalent` DECIMAL(15,6) NOT NULL COMMENT 'Pure metal grams = net_weight × purity %',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when product record was created',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when product record was last updated',

  PRIMARY KEY (`id`),

  -- Foreign key reference to physical_deposit table
  CONSTRAINT `fk_physical_deposit_products_deposit`
    FOREIGN KEY (`deposit_id`) REFERENCES `physical_deposit`(`id`)
    ON DELETE CASCADE
);

-- Alter otp logs table - by Shubham
ALTER TABLE `otp_logs`
ADD COLUMN `ref_id` BIGINT DEFAULT NULL COMMENT 'Reference ID for linking OTP to a flow' AFTER `context`;

-- Created new table for storing content pages - by Shubham
CREATE TABLE IF NOT EXISTS `content_pages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID of the page',
  `page_name` VARCHAR(255) NOT NULL COMMENT 'Name of the page',
  `page_details` LONGTEXT NOT NULL COMMENT 'Page details or content (may contain HTML)',
  `page_type` VARCHAR(50) DEFAULT NULL COMMENT 'Defines which role/app this page belongs to',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT 'Status of the page (0 = inactive, 1 = active)',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT 'Soft delete flag (0 = not deleted, 1 = deleted)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation date',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update date',

  PRIMARY KEY (`id`)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Stores static/dynamic page content';


-- Created new table for storing service control data - by Shubham
CREATE TABLE IF NOT EXISTS `service_control` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary ID of the service control record',
  `service_key` BIGINT DEFAULT NULL COMMENT 'Unique identifier of the service flow (mapped in code)',
  `is_enabled` TINYINT NOT NULL DEFAULT 1 COMMENT 'Service status: 1 = Enabled, 0 = Disabled',
  `reason` VARCHAR(255) DEFAULT NULL COMMENT 'Reason provided by admin when disabling the service',
  `toggled_by` BIGINT DEFAULT NULL COMMENT 'Admin user ID who last toggled the service',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation date',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record last update date',
  PRIMARY KEY (`id`)
) COMMENT='Stores service control data';


-- Alter user table - by Shubham
ALTER TABLE users
ADD COLUMN is_agreed TINYINT(1) NOT NULL DEFAULT 0
COMMENT 'User agreement accepted (0 = No, 1 = Yes)'
AFTER user_verified;


