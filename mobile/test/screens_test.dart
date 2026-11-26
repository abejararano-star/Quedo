import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:quedo/catalog.dart';
import 'package:quedo/main.dart';
import 'package:quedo/saved.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

void main() {
  testWidgets(
    'la ficha de un anuncio muestra la tarifa y la consulta de fechas',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final previous = SharedPreferencesAsyncPlatform.instance;
      SharedPreferencesAsyncPlatform.instance =
          InMemorySharedPreferencesAsync.empty();
      addTearDown(() => SharedPreferencesAsyncPlatform.instance = previous);
      final base = Uri.parse('https://quedo.example');
      final listing = {
        'slug': 'luz-y-calma',
        'title': 'Luz y calma',
        'summary': 'Apartaestudio en el Centro',
        'district': 'Centro',
        'city': 'Quibdó',
        'type': 'Apartaestudio',
        'nightly_price': 125000,
        'capacity': 2,
        'bedrooms': 1,
        'beds': 1,
        'bathrooms': 1,
        'demo': true,
        'photos': ['/images/apartment-1.jpg', '/images/apartment-2.jpg'],
        'contact_available': false,
      };
      final catalog = QuedoCatalog(
        base,
        MockClient(
          (request) async => http.Response(
            jsonEncode({'data': listing}),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          ),
        ),
      );
      final saved = SavedListings(SharedPreferencesAsync(), base.origin);
      addTearDown(catalog.close);
      addTearDown(saved.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: ListingScreen(
            slug: 'luz-y-calma',
            catalog: catalog,
            saved: saved,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Luz y calma'), findsOneWidget);
      await tester.tap(find.byTooltip('Ampliar foto'));
      await tester.pumpAndSettle();
      expect(find.text('Foto 1 de 2'), findsOneWidget);
      await tester.tap(find.byTooltip('Foto siguiente'));
      await tester.pumpAndSettle();
      expect(find.text('Foto 2 de 2'), findsOneWidget);
      await tester.tap(find.text('Volver a la ficha'));
      await tester.pumpAndSettle();
      expect(find.text('Luz y calma'), findsOneWidget);
      await tester.tap(find.byTooltip('Guardar estadía'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Quitar de guardados'), findsOneWidget);
      final reopened = SavedListings(SharedPreferencesAsync(), base.origin);
      addTearDown(reopened.dispose);
      await reopened.load();
      expect(reopened.slugs, ['luz-y-calma']);
      await tester.scrollUntilVisible(
        find.text('Consultar fechas'),
        200,
        scrollable: find.byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              widget.axisDirection == AxisDirection.down,
        ),
      );
      expect(find.textContaining('125.000'), findsOneWidget);
      expect(find.text('Consultar en Quedo'), findsNothing);
    },
  );
}
