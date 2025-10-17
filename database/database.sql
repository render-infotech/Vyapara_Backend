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
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary ID of the customer details record',
  `customer_id` BIGINT NOT NULL COMMENT 'Reference to the user this record belongs to',
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

-- Created new table for vendor details - by Shubham
CREATE TABLE IF NOT EXISTS `vendor_details` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary ID of the vendor details record',
  `vendor_id` BIGINT NOT NULL COMMENT 'Reference to the user this vendor belongs to',
  `vendor_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique code of the vendor, auto-generated',
  `business_name` VARCHAR(150) DEFAULT NULL COMMENT 'Business name of the vendor',
  `address_line` TEXT DEFAULT NULL COMMENT 'Street address or shop location',
  `country` VARCHAR(100) NOT NULL COMMENT 'Country name of the vendor',
  `state` VARCHAR(100) NOT NULL COMMENT 'State name of the vendor',
  `city` VARCHAR(100) NOT NULL COMMENT 'City name of the vendor',
  `postal_code` VARCHAR(15) DEFAULT NULL COMMENT 'Postal/ZIP code of the vendor',
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