CREATE DATABASE vyapara;

-- Created new table for all the users - by Shubham
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID of the users',
  `first_name` VARCHAR(50) NOT NULL COMMENT 'The first name of the user',
  `middle_name` VARCHAR(50) DEFAULT NULL COMMENT 'The middle name of the user',
  `last_name` VARCHAR(50) DEFAULT NULL COMMENT 'The last name of the user',
  `profile_pic` TEXT DEFAULT NULL COMMENT 'The profile pic URL',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email ID of the user',
  `password` VARCHAR(255) NOT NULL COMMENT 'Password of the user',
  `phone_country_code` VARCHAR(10) DEFAULT NULL COMMENT 'The phone country code (IN, US, etc)',
  `phone_code` VARCHAR(10) DEFAULT NULL COMMENT 'The phone code of the phone country',
  `phone` VARCHAR(15) DEFAULT NULL COMMENT 'The phone number of the user',
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


-- Created new table to add tax precentage by admin - by Shubham
CREATE TABLE IF NOT EXISTS `tax_rate` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the tax rate',
  `material_id` INT NOT NULL COMMENT 'Material reference (1 = Gold, 2 = Silver)',
  `tax_type` INT NOT NULL COMMENT 'Tax type reference (1 = GST, etc)',
  `tax_percentage` DECIMAL(6,2) NOT NULL COMMENT 'Applied tax rate percentage',
  `tax_on` INT NOT NULL COMMENT 'What this tax applies to (1 = Material, 2 = Service_fee)',
  `is_latest` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Marks latest tax entry for material + tax name + tax_on + tax_percentage',
  `effective_date` DATE NOT NULL COMMENT 'Tax effective start date',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT 'Is the tax rate active? (1 = Active, 0 = Inactive)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Table for storing tax rates';



-- Created new table for digital purchases - by Shubham
CREATE TABLE IF NOT EXISTS `digital_purchase` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID of the purchase',
  `customer_id` BIGINT NOT NULL COMMENT 'Foreign key of the customer who made the purchase',
  `transaction_type_id` INT NOT NULL DEFAULT 1 COMMENT 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
  `purchase_code` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique purchase identifier (e.g., DP20251013-001)',
  `material_id` INT NOT NULL COMMENT 'Material type (1 = Gold, 2 = Silver)',
  `amount` DECIMAL(15,2) NOT NULL COMMENT 'Base amount entered by customer (excluding taxes)',
  `price_per_gram` DECIMAL(15,2) NOT NULL COMMENT 'Metal price per gram at purchase time',
  `grams_purchased` DECIMAL(15,6) NOT NULL COMMENT 'Grams calculated',
  `tax_percentage` DECIMAL(5,2) NOT NULL DEFAULT 18.0 COMMENT 'Applicable tax percentage (e.g., GST)',
  `tax_amount` DECIMAL(15,2) NOT NULL COMMENT 'Calculated tax amount',
  `convenience_fee_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Convenience fee rate (%)',
  `convenience_fee` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Convenience fee amount',
  `total_amount` DECIMAL(15,2) NOT NULL COMMENT 'Total amount including tax and convenience fee',
  `purchase_status` INT NOT NULL DEFAULT 1 COMMENT 'Purchase status (1 = Pending, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = Refunded)',
  `rate_timestamp` DATETIME DEFAULT NULL COMMENT 'Timestamp when the rate was fetched',
  `remarks` TEXT DEFAULT NULL COMMENT 'Optional remarks or notes about the transaction',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_digital_purchase_user`
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
COMMENT='Digital gold/silver purchase records table';


