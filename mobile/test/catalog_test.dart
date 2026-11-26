import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:quedo/catalog.dart';

void main() {
  final origin = Uri.parse('https://quedo.example');

  test('carga el catálogo y escapa los parámetros de búsqueda', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/api/v1/estadias');
      expect(request.url.queryParameters, {
        'pagina': '2',
        'q': 'Quibdó & Centro',
        'tipo': 'Apartamento',
        'barrio': 'César Conto',
      });
      return http.Response(
        jsonEncode({
          'data': [
            {
              'slug': 'luz-y-calma',
              'title': 'Luz y calma',
              'summary': 'Descripción breve',
              'district': 'Centro',
              'city': 'Quibdó',
              'type': 'Apartamento',
              'nightly_price': 125000,
              'capacity': 2,
              'bedrooms': 1,
              'beds': 1,
              'bathrooms': 1,
              'demo': true,
              'photos': ['/images/apartment-1.jpg'],
            },
          ],
          'next_page': 3,
        }),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    });
    final catalog = QuedoCatalog(origin, client);
    final results = await catalog.search(
      query: 'Quibdó & Centro',
      type: 'Apartamento',
      district: 'César Conto',
      page: 2,
    );
    expect(results.items.single.city, 'Quibdó');
    expect(results.items.single.demo, isTrue);
    expect(results.nextPage, 3);
  });

  test('lee referencias públicas y conteos del mapa de Quibdó', () async {
    final catalog = QuedoCatalog(
      origin,
      MockClient((request) async {
        expect(request.url.path, '/api/v1/mapa/zonas');
        expect(request.url.query, isEmpty);
        return http.Response(
          jsonEncode({
            'data': [
              {
                'district': 'La Yesquita',
                'latitude': 5.68627,
                'longitude': -76.66057,
                'count': 2,
              },
            ],
          }),
          200,
        );
      }),
    );
    final zone = (await catalog.mapZones()).single;
    expect(zone.district, 'La Yesquita');
    expect(zone.point.latitude, 5.68627);
    expect(zone.count, 2);
  });

  test(
    'distingue la retirada de una publicación de un error del servidor',
    () async {
      final catalog = QuedoCatalog(
        origin,
        MockClient((_) async => http.Response('{}', 404)),
      );
      await expectLater(
        catalog.detail('luz-y-calma'),
        throwsA(isA<ListingUnavailable>()),
      );
    },
  );

  test(
    'las fotos solo pueden cargarse desde rutas públicas del mismo origen',
    () {
      final catalog = QuedoCatalog(
        origin,
        MockClient((_) async => http.Response('{}', 200)),
      );
      expect(catalog.photo('/images/apartment-1.jpg').origin, origin.origin);
      expect(
        () => catalog.photo('https://otro.example/img.jpg'),
        throwsFormatException,
      );
      expect(() => catalog.photo('/images/..'), throwsFormatException);
    },
  );
}
