import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import 'catalog.dart';

const _quibdo = LatLng(5.6878, -76.652);
const _tiles = String.fromEnvironment(
  'QUEDO_MAP_TILES',
  defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
);
const _mapAttribution = String.fromEnvironment(
  'QUEDO_MAP_ATTRIBUTION',
  defaultValue: '© OpenStreetMap',
);
const _mapAttributionUrl = String.fromEnvironment(
  'QUEDO_MAP_ATTRIBUTION_URL',
  defaultValue: 'https://www.openstreetmap.org/copyright',
);

class QuedoMap extends StatefulWidget {
  const QuedoMap({
    super.key,
    required this.catalog,
    required this.openListing,
    required this.priceLabel,
    this.initialDistrict,
  });

  final QuedoCatalog catalog;
  final ValueChanged<Listing> openListing;
  final String Function(int) priceLabel;
  final String? initialDistrict;

  @override
  State<QuedoMap> createState() => _QuedoMapState();
}

class _QuedoMapState extends State<QuedoMap> {
  final _controller = MapController();
  late Future<List<MapZone>> _zones;
  late String? _district;
  LatLng? _position;
  double _accuracy = 0;
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    _district = widget.initialDistrict;
    _zones = widget.catalog.mapZones();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _select(MapZone zone) {
    setState(() => _district = zone.district);
    _controller.move(zone.point, 15);
  }

  void _message(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _locate() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _message(
          'Activa la ubicación en tu dispositivo para usar esta función.',
        );
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.unableToDetermine) {
        permission = await Geolocator.requestPermission();
      }
      if (permission != LocationPermission.whileInUse &&
          permission != LocationPermission.always) {
        _message(
          'Puedes dar permiso de ubicación en los ajustes del dispositivo o navegador.',
        );
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.low,
          timeLimit: Duration(seconds: 18),
        ),
      );
      if (!mounted) return;
      final point = LatLng(position.latitude, position.longitude);
      if (const Distance().as(LengthUnit.Kilometer, _quibdo, point) > 18) {
        setState(() => _position = null);
        _message(
          'Estás fuera del área de Quibdó. Puedes seguir explorando las zonas del mapa.',
        );
        return;
      }
      setState(() {
        _position = point;
        _accuracy = position.accuracy.clamp(0, 5000).toDouble();
      });
      _controller.move(point, 14);
    } catch (_) {
      _message(
        'No pudimos obtener tu ubicación. Puedes seguir usando el mapa.',
      );
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _showStays(MapZone zone) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => FractionallySizedBox(
        heightFactor: .84,
        child: _ZoneStays(
          zone: zone,
          catalog: widget.catalog,
          priceLabel: widget.priceLabel,
          openListing: (listing) {
            Navigator.of(context).pop();
            widget.openListing(listing);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<MapZone>>(
      future: _zones,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final zones = snapshot.data ?? [];
        if (snapshot.hasError || zones.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('No pudimos cargar el mapa de zonas.'),
                  TextButton(
                    onPressed: () =>
                        setState(() => _zones = widget.catalog.mapZones()),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }
        final selected = zones
            .where((zone) => zone.district == _district)
            .firstOrNull;
        final position = _position;
        final primary = Theme.of(context).colorScheme.primary;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Mapa de Quibdó',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text('Los marcadores indican zonas aproximadas.'),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _controller,
                    options: MapOptions(
                      initialCenter: selected?.point ?? _quibdo,
                      initialZoom: selected == null ? 14 : 15,
                      initialCameraFit: selected == null
                          ? CameraFit.coordinates(
                              coordinates: zones
                                  .map((zone) => zone.point)
                                  .toList(),
                              padding: const EdgeInsets.fromLTRB(
                                34,
                                56,
                                54,
                                50,
                              ),
                            )
                          : null,
                      minZoom: 10,
                      maxZoom: 19,
                      interactionOptions: const InteractionOptions(
                        flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                      ),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: _tiles,
                        userAgentPackageName: 'com.quedo.estadias',
                      ),
                      if (position != null && _accuracy > 0)
                        CircleLayer(
                          circles: [
                            CircleMarker(
                              point: position,
                              radius: _accuracy,
                              useRadiusInMeter: true,
                              color: const Color(0x223e74f2),
                              borderColor: const Color(0x593e74f2),
                              borderStrokeWidth: 1,
                            ),
                          ],
                        ),
                      MarkerLayer(
                        markers: [
                          for (final zone in zones)
                            Marker(
                              point: zone.point,
                              width: 40,
                              height: 40,
                              child: Tooltip(
                                message:
                                    '${zone.district} · ${zone.count} alojamientos',
                                child: Material(
                                  color: selected == zone
                                      ? primary
                                      : Colors.white,
                                  shape: const CircleBorder(),
                                  elevation: 3,
                                  child: InkWell(
                                    customBorder: const CircleBorder(),
                                    onTap: () => _select(zone),
                                    child: Center(
                                      child: Text(
                                        '${zone.count}',
                                        style: TextStyle(
                                          color: selected == zone
                                              ? Colors.white
                                              : primary,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          if (position != null)
                            Marker(
                              point: position,
                              width: 25,
                              height: 25,
                              child: const Tooltip(
                                message: 'Tu ubicación aproximada',
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: Color(0xff2464e0),
                                    shape: BoxShape.circle,
                                    border: Border.fromBorderSide(
                                      BorderSide(color: Colors.white, width: 3),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Column(
                      children: [
                        IconButton.filledTonal(
                          tooltip: 'Mi ubicación',
                          onPressed: _locating ? null : _locate,
                          icon: _locating
                              ? const SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.my_location),
                        ),
                        IconButton.filledTonal(
                          tooltip: 'Volver a Quibdó',
                          onPressed: () {
                            setState(() => _district = null);
                            _controller.fitCamera(
                              CameraFit.coordinates(
                                coordinates: zones
                                    .map((zone) => zone.point)
                                    .toList(),
                                padding: const EdgeInsets.fromLTRB(
                                  34,
                                  56,
                                  54,
                                  50,
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.center_focus_strong),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    right: 4,
                    bottom: 3,
                    child: Material(
                      color: const Color(0xecffffff),
                      borderRadius: BorderRadius.circular(6),
                      child: InkWell(
                        onTap: () => launchUrl(Uri.parse(_mapAttributionUrl)),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: 5,
                            horizontal: 7,
                          ),
                          child: Text(
                            _mapAttribution,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 8, 12, 4),
              child: Row(
                children: [
                  for (final zone in zones)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(zone.district),
                        selected: selected == zone,
                        onSelected: (_) => _select(zone),
                      ),
                    ),
                ],
              ),
            ),
            if (selected != null)
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                title: Text(selected.district),
                subtitle: Text(switch (selected.count) {
                  0 => 'Por ahora no hay alojamientos en esta zona.',
                  1 => 'Ver el alojamiento de esta zona',
                  final count => 'Ver $count alojamientos en esta zona',
                }),
                trailing: selected.count > 0
                    ? const Icon(Icons.arrow_forward)
                    : null,
                onTap: selected.count > 0 ? () => _showStays(selected) : null,
              ),
          ],
        );
      },
    );
  }
}

class _ZoneStays extends StatefulWidget {
  const _ZoneStays({
    required this.zone,
    required this.catalog,
    required this.priceLabel,
    required this.openListing,
  });
  final MapZone zone;
  final QuedoCatalog catalog;
  final String Function(int) priceLabel;
  final ValueChanged<Listing> openListing;

  @override
  State<_ZoneStays> createState() => _ZoneStaysState();
}

class _ZoneStaysState extends State<_ZoneStays> {
  final List<Listing> _items = [];
  int? _next = 1;
  bool _loading = false;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final page = _next;
    if (_loading || page == null) return;
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final result = await widget.catalog.search(
        district: widget.zone.district,
        page: page,
      );
      if (!mounted) return;
      setState(() {
        _items.addAll(result.items);
        _next = result.nextPage;
      });
    } catch (_) {
      if (mounted) setState(() => _error = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        Text(
          widget.zone.district,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        for (final stay in _items)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.bed_outlined),
            title: Text(stay.title),
            subtitle: Text(
              '${widget.priceLabel(stay.price)} por noche${stay.demo ? ' · Ejemplo' : ''}',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => widget.openListing(stay),
          ),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_error)
          TextButton(
            onPressed: _load,
            child: const Text('Reintentar cargar los alojamientos'),
          )
        else if (_next != null)
          TextButton(onPressed: _load, child: const Text('Ver más'))
        else if (_items.isEmpty)
          const Text('Por ahora no hay alojamientos en esta zona.'),
      ],
    );
  }
}
