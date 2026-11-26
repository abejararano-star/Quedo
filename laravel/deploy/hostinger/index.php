<?php

use Illuminate\Http\Request;

$application = dirname(__DIR__).'/quedo';
require $application.'/vendor/autoload.php';

$app = require $application.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);
$app->handleRequest(Request::capture());
