param(
    [string]$RootCertificatePath = (Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads\prod-ca-2021.crt')
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath $RootCertificatePath -PathType Leaf)) {
    throw 'Download the Supabase CA certificate from Database Settings > SSL Configuration first. Save it as Downloads\prod-ca-2021.crt, or pass -RootCertificatePath with its location.'
}
$verifiedCertificatePath = (Resolve-Path -LiteralPath $RootCertificatePath).Path
if ((Get-Content -LiteralPath $verifiedCertificatePath -Raw) -notmatch '-----BEGIN CERTIFICATE-----') {
    throw 'The selected file must be the PEM CA certificate downloaded from Supabase Database Settings.'
}
$encodedCertificatePath = [Uri]::EscapeDataString($verifiedCertificatePath)
$env:SUPABASE_URL = 'https://nzazyqbqldqzsumusjld.supabase.co'
$env:FRONTEND_ORIGIN = 'http://localhost:3001'
$env:SERVER_PORT = '8080'
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=' + $encodedCertificatePath
$env:SPRING_DATASOURCE_USERNAME = 'postgres.nzazyqbqldqzsumusjld'
# Windows trust is used for Maven and HTTPS signing-key downloads.
# PostgreSQL uses the explicitly downloaded Supabase CA through sslrootcert.
$previousJavaOptions = $env:JAVA_TOOL_OPTIONS
$env:JAVA_TOOL_OPTIONS = (($previousJavaOptions + ' -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE').Trim())
$privatePassword = Read-Host 'Enter your Supabase DATABASE password (hidden)' -AsSecureString
$privatePointer = [IntPtr]::Zero
try {
    $privatePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($privatePassword)
    $env:SPRING_DATASOURCE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($privatePointer)
    Write-Host 'Starting Motorva backend. Keep this terminal open. Press Ctrl+C to stop.'
    & .\mvnw.cmd spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw 'Backend startup failed. Check the error above without sharing your password.' }
} finally {
    if ($privatePointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($privatePointer) }
    $privatePassword.Dispose()
    Remove-Item Env:SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
    $env:JAVA_TOOL_OPTIONS = $previousJavaOptions
}
