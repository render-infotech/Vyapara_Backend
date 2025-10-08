# Tranquil Care Backend

## To get up and running:

### install global packages

```
npm install -g serverless
```

### Setup ENV file

- Setup ENV file with the following
- Create a .env file and get the values from the lead

```
  ENVIRONMENT=
  STAGE=
  DBHOST=
  DBUSER=
  DBDATABASE=
  DBPASSWORD=
  DBPORT=
  JWT_PRIVKEY=
  DEV_OTP=
  S3_BUCKET=
  S3_ACCESS_KEY=
  S3_SECRET_KEY=
  S3_REGION=
  SES_REGION=
  EMAIL_ENABLED=
  API_ENDPOINT=
  FRONTEND_URL=
  INTERNAL_KEY=
  EMAIL_ENABLED=
  EMAIL_HOST=
  EMAIL_PORT=
  EMAIL_SSL=
  EMAIL_USER=
  EMAIL_PASSWORD=
  TWILIO_ACCOUNT_SID=
  TWILIO_AUTH_TOKEN=
  TWILIO_PHONE_NUMBER=
```

### Source ENV:

- For linux just add a .env file
- For Mac run:
  `set -o allexport; source .env; set +o allexport`
- For Windows: (We mainly use Powershell to run the backend)
- Create a sourceEnv.ps1
- Add the ENV as follows:

```
  $env:ENVIRONMENT=""
  $env:STAGE=
  $env:DBHOST=""
  $env:DBUSER=""
  $env:DBDATABASE=""
  $env:DBPASSWORD=""
  $env:DBPORT=""
  $env:JWT_PRIVKEY=""
  $env:DEV_OTP=""
  $env:S3_BUCKET=""
  $env:S3_ACCESS_KEY=""
  $env:S3_SECRET_KEY=""
  $env:S3_REGION=""
  $env:SES_REGION=""
  $env:EMAIL_ENABLED=""
  $env:API_ENDPOINT=""
  $env:FRONTEND_URL=""
  $env:INTERNAL_KEY=""
  $env:EMAIL_ENABLED=''
  $env:EMAIL_HOST=""
  $env:EMAIL_PORT=""
  $env:EMAIL_SSL=""
  $env:EMAIL_USER=""
  $env:EMAIL_PASSWORD=""
  $env:TWILIO_ACCOUNT_SID=""
  $env:TWILIO_AUTH_TOKEN=""
  $env:TWILIO_PHONE_NUMBER=""
```

- run the .\sourceEnv.ps1 in terminal
