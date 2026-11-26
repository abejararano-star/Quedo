import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class Listing {
  const Listing({
    required this.slug,
    required this.title,
    required this.summary,
    required this.district,
    required this.city,
    required this.type,
    required this.price,
    required this.capacity,
    required this.bedrooms,
    required this.beds,
    required this.bathrooms,
    required this.demo,
    required this.photos,
    required this.description,
    required this.amenities,
    required this.rules,
    required this.additionalCosts,
    required this.weeklyPrice,
    required this.canContact,
  });

  factory Listing.fromJson(Map<String, dynamic> json) => Listing(
    slug: json['slug'] as String,
    title: json['title'] as String,
    summary: json['summary'] as String,
    district: json['district'] as String,
    city: json['city'] as String,
    type: json['type'] as String,
    price: json['nightly_price'] as int,
    capacity: json['capacity'] as int,
    bedrooms: json['bedrooms'] as int,
    beds: json['beds'] as int,
    bathrooms: json['bathrooms'] as int,
    demo: json['demo'] as bool,
    photos: List<String>.from(json['photos'] as List),
    description: json['description'] as String? ?? '',
    amenities: List<String>.from(json['amenities'] as List? ?? []),
    rules: json['rules'] as String? ?? '',
    additionalCosts: json['additional_costs'] as String? ?? '',
    weeklyPrice: json['weekly_price'] as int?,
    canContact: json['contact_available'] as bool? ?? false,
  );

  final String slug, title, summary, district, city, type;
  final int price, capacity, bedrooms, beds, bathrooms;
  final bool demo, canContact;
  final List<String> photos, amenities;
  final String description, rules, additionalCosts;
  final int? weeklyPrice;
}

class CatalogPage {
  const CatalogPage(this.items, this.nextPage);
  final List<Listing> items;
  final int? nextPage;
}

class MapZone {
  const MapZone(this.district, this.point, this.count);

  factory MapZone.fromJson(Map<String, dynamic> json) => MapZone(
    json['district'] as String,
    LatLng(
      (json['latitude'] as num).toDouble(),
      (json['longitude'] as num).toDouble(),
    ),
    json['count'] as int,
  );

  final String district;
  final LatLng point;
  final int count;
}

class ListingUnavailable implements Exception {
  const ListingUnavailable();
}

class QuedoCatalog {
  QuedoCatalog(this.base, this.client);

  factory QuedoCatalog.fromEnvironment() {
    const configured = String.fromEnvironment('QUEDO_URL');
    // Android emulator maps the host loopback to this address.
    final fallback = !kIsWeb && defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:8089'
        : 'http://127.0.0.1:8089';
    final base = Uri.tryParse(
      configured.isEmpty && kDebugMode ? fallback : configured,
    );
    final validOrigin =
        base != null &&
        base.host.isNotEmpty &&
        base.userInfo.isEmpty &&
        !base.hasQuery &&
        !base.hasFragment &&
        (base.path.isEmpty || base.path == '/');
    final localDebug =
        base?.scheme == 'http' &&
        kDebugMode &&
        {'10.0.2.2', '127.0.0.1', 'localhost'}.contains(base?.host);
    if (base == null ||
        !validOrigin ||
        (base.scheme != 'https' && !localDebug)) {
      throw const FormatException(
        'Configura QUEDO_URL con el dominio HTTPS de Quedo.',
      );
    }
    return QuedoCatalog(base, http.Client());
  }

  final Uri base;
  final http.Client client;

  Uri web(String path, [Map<String, String>? query]) =>
      base.replace(path: path, queryParameters: query);

  Uri photo(String path) {
    if (!RegExp(r'^/(images/[a-zA-Z0-9._-]+|media/[a-f0-9-]{36}\.webp)$')
            .hasMatch(path) ||
        path.endsWith('/.') ||
        path.endsWith('/..')) {
      throw const FormatException('Ruta de foto inválida');
    }
    return web(path);
  }

  Future<CatalogPage> search({
    String query = '',
    String? type,
    String? district,
    int page = 1,
  }) async {
    final json = await _get(
      web('/api/v1/estadias', {
        'pagina': '$page',
        if (query.isNotEmpty) 'q': query,
        'tipo': ?type,
        'barrio': ?district,
      }),
    );
    final rows = json['data'] as List;
    return CatalogPage(
      rows.map((row) => Listing.fromJson(row as Map<String, dynamic>)).toList(),
      json['next_page'] as int?,
    );
  }

  Future<List<MapZone>> mapZones() async {
    final json = await _get(web('/api/v1/mapa/zonas'));
    return (json['data'] as List)
        .map((row) => MapZone.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<Listing> detail(String slug) async {
    if (!RegExp(r'^[a-z0-9-]{1,190}$').hasMatch(slug)) {
      throw const ListingUnavailable();
    }
    final json = await _get(web('/api/v1/estadias/$slug'));
    return Listing.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> _get(Uri url) async {
    final response = await client
        .get(url, headers: {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 12));
    if (response.statusCode == 404) throw const ListingUnavailable();
    if (response.statusCode != 200) {
      throw const FormatException('Respuesta del catálogo no disponible.');
    }
    return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
  }

  void close() => client.close();
}
