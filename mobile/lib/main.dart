import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import 'catalog.dart';
import 'quedo_map.dart';
import 'saved.dart';

const navy = Color(0xff102c42);
const gold = Color(0xffd5a547);
const canvas = Color(0xfff6f7f5);
final _currency = NumberFormat.decimalPattern('es_CO');
String cop(int value) => '\$ ${_currency.format(value)} COP';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    runApp(QuedoApp(catalog: QuedoCatalog.fromEnvironment()));
  } on FormatException catch (error) {
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(error.message),
            ),
          ),
        ),
      ),
    );
  }
}

class QuedoApp extends StatefulWidget {
  const QuedoApp({super.key, required this.catalog});
  final QuedoCatalog catalog;

  @override
  State<QuedoApp> createState() => _QuedoAppState();
}

class _QuedoAppState extends State<QuedoApp> {
  late final SavedListings _saved;
  late final Future<void> _ready;

  @override
  void initState() {
    super.initState();
    _saved = SavedListings(
      SharedPreferencesAsync(),
      widget.catalog.base.origin,
    );
    _ready = _saved.load();
  }

  @override
  void dispose() {
    _saved.dispose();
    widget.catalog.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quedo Estadías',
      debugShowCheckedModeBanner: false,
      locale: const Locale('es', 'CO'),
      supportedLocales: const [Locale('es', 'CO')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: navy,
          primary: navy,
          secondary: gold,
        ),
        scaffoldBackgroundColor: canvas,
        inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(),
        ),
      ),
      home: FutureBuilder<void>(
        future: _ready,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          if (snapshot.hasError) {
            return const Scaffold(
              body: Center(
                child: Text('No pudimos abrir tus guardados. Reinicia Quedo.'),
              ),
            );
          }
          return QuedoHome(catalog: widget.catalog, saved: _saved);
        },
      ),
    );
  }
}

class QuedoHome extends StatefulWidget {
  const QuedoHome({super.key, required this.catalog, required this.saved});
  final QuedoCatalog catalog;
  final SavedListings saved;

  @override
  State<QuedoHome> createState() => _QuedoHomeState();
}

class _QuedoHomeState extends State<QuedoHome> {
  int _tab = 0;
  bool _mapOpened = false;

  void _detail(Listing item) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (context) => ListingScreen(
        slug: item.slug,
        catalog: widget.catalog,
        saved: widget.saved,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Row(
          children: [
            Image.asset('assets/quedo.png', width: 32, height: 32),
            const SizedBox(width: 10),
            const Text(
              'Quedo',
              style: TextStyle(color: navy, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
      body: SafeArea(
        top: false,
        child: IndexedStack(
          index: _tab,
          children: [
            ExploreScreen(
              catalog: widget.catalog,
              saved: widget.saved,
              open: _detail,
            ),
            if (_mapOpened)
              QuedoMap(
                catalog: widget.catalog,
                openListing: _detail,
                priceLabel: cop,
              )
            else
              const SizedBox.shrink(),
            SavedScreen(
              catalog: widget.catalog,
              saved: widget.saved,
              open: _detail,
            ),
            AccountScreen(catalog: widget.catalog),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (index) => setState(() {
          _tab = index;
          _mapOpened = _mapOpened || index == 1;
        }),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.search), label: 'Explorar'),
          NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Mapa'),
          NavigationDestination(
            icon: Icon(Icons.favorite_border),
            label: 'Guardados',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Mi cuenta',
          ),
        ],
      ),
    );
  }
}

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({
    super.key,
    required this.catalog,
    required this.saved,
    required this.open,
  });
  final QuedoCatalog catalog;
  final SavedListings saved;
  final ValueChanged<Listing> open;

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _search = TextEditingController();
  List<Listing> _items = [];
  String? _type;
  String _query = '';
  int? _nextPage;
  int _generation = 0;
  bool _loading = true;
  bool _more = false;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool more = false}) async {
    final page = more ? _nextPage : 1;
    if (page == null || (more && (_more || _loading))) return;
    final request = ++_generation;
    setState(() {
      _error = false;
      _loading = !more;
      _more = more;
      if (!more) {
        _items = [];
        _nextPage = null;
      }
    });
    try {
      final result = await widget.catalog.search(
        query: _query,
        type: _type,
        page: page,
      );
      if (!mounted || request != _generation) return;
      setState(() {
        _items = more ? [..._items, ...result.items] : result.items;
        _nextPage = result.nextPage;
      });
    } catch (_) {
      if (mounted && request == _generation) setState(() => _error = true);
    } finally {
      if (mounted && request == _generation) {
        setState(() {
          _loading = false;
          _more = false;
        });
      }
    }
  }

  void _submit(String _) {
    _query = String.fromCharCodes(_search.text.trim().runes.take(100));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        key: const PageStorageKey('quedo-explore'),
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            sliver: SliverList.list(
              children: [
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: navy,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'QUIBDÓ, CHOCÓ',
                        style: TextStyle(
                          color: gold,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.8,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Encuentra tu estadía',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 29,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SearchBar(
                  controller: _search,
                  hintText: 'Barrio o alojamiento',
                  onSubmitted: _submit,
                  padding: const WidgetStatePropertyAll(
                    EdgeInsets.symmetric(horizontal: 16),
                  ),
                  leading: const Icon(Icons.search),
                  trailing: [
                    IconButton(
                      tooltip: 'Buscar estadías',
                      onPressed: () => _submit(_search.text),
                      icon: const Icon(Icons.arrow_forward),
                    ),
                  ],
                  textInputAction: TextInputAction.search,
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final type in <String?>[
                        null,
                        'Apartamento',
                        'Apartaestudio',
                        'Habitación',
                        'Casa',
                      ])
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(type ?? 'Todas'),
                            selected: _type == type,
                            onSelected: (_) {
                              _type = type;
                              _load();
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Notice(
                message: _error
                    ? 'No pudimos cargar las estadías.'
                    : 'No hay alojamientos para esta búsqueda.',
                retry: _error ? () => _load() : null,
              ),
            )
          else ...[
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList.builder(
                itemCount: _items.length,
                itemBuilder: (context, index) => StayCard(
                  item: _items[index],
                  catalog: widget.catalog,
                  saved: widget.saved,
                  open: widget.open,
                ),
              ),
            ),
            if (_nextPage != null)
              SliverToBoxAdapter(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: _more
                        ? const CircularProgressIndicator()
                        : OutlinedButton(
                            onPressed: () => _load(more: true),
                            child: Text(
                              _error ? 'Reintentar' : 'Ver más estadías',
                            ),
                          ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class SavedScreen extends StatefulWidget {
  const SavedScreen({
    super.key,
    required this.catalog,
    required this.saved,
    required this.open,
  });
  final QuedoCatalog catalog;
  final SavedListings saved;
  final ValueChanged<Listing> open;

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  late Future<List<Listing>> _items;
  int _limit = 6;

  @override
  void initState() {
    super.initState();
    _items = _load();
    widget.saved.addListener(_refresh);
  }

  @override
  void dispose() {
    widget.saved.removeListener(_refresh);
    super.dispose();
  }

  Future<List<Listing>> _load() async {
    final items = await Future.wait(
      widget.saved.slugs.take(_limit).map((slug) async {
        try {
          return await widget.catalog.detail(slug);
        } on ListingUnavailable {
          return null;
        }
      }),
    );
    return items.whereType<Listing>().toList();
  }

  void _refresh() => setState(() => _items = _load());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Listing>>(
      future: _items,
      builder: (context, snapshot) => RefreshIndicator(
        onRefresh: () async {
          _refresh();
          try {
            await _items;
          } catch (_) {
            /* The builder shows the error. */
          }
        },
        child: ListView(
          key: const PageStorageKey('quedo-saved'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Tus guardados',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const Text('Se conservan en este dispositivo.'),
            const SizedBox(height: 14),
            if (snapshot.connectionState != ConnectionState.done)
              const Center(child: CircularProgressIndicator())
            else if (snapshot.hasError)
              Notice(
                message: 'No pudimos actualizar tus guardados.',
                retry: _refresh,
              )
            else if (snapshot.data!.isEmpty)
              const Notice(
                message:
                    'Toca el corazón de una estadía para encontrarla aquí.',
              )
            else
              for (final item in snapshot.data!)
                StayCard(
                  item: item,
                  catalog: widget.catalog,
                  saved: widget.saved,
                  open: widget.open,
                ),
            if (!snapshot.hasError &&
                snapshot.connectionState == ConnectionState.done &&
                widget.saved.slugs.length > _limit)
              OutlinedButton(
                onPressed: () {
                  _limit += 6;
                  _refresh();
                },
                child: const Text('Ver más'),
              ),
          ],
        ),
      ),
    );
  }
}

class StayCard extends StatelessWidget {
  const StayCard({
    super.key,
    required this.item,
    required this.catalog,
    required this.saved,
    required this.open,
  });
  final Listing item;
  final QuedoCatalog catalog;
  final SavedListings saved;
  final ValueChanged<Listing> open;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => open(item),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1.9,
                  child: StayPhoto(
                    catalog: catalog,
                    path: item.photos.firstOrNull,
                  ),
                ),
                Positioned(
                  right: 10,
                  top: 10,
                  child: SaveButton(item: item, saved: saved),
                ),
                if (item.demo)
                  Positioned(
                    left: 12,
                    top: 12,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: navy,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(
                          vertical: 5,
                          horizontal: 8,
                        ),
                        child: Text(
                          'Ejemplo',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${item.district}, ${item.city}',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text('${item.type} · ${item.capacity} huéspedes'),
                  const SizedBox(height: 10),
                  Text(
                    '${cop(item.price)} por noche',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class StayPhoto extends StatelessWidget {
  const StayPhoto({
    super.key,
    required this.catalog,
    required this.path,
    this.fit = BoxFit.cover,
  });
  final QuedoCatalog catalog;
  final String? path;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    const placeholder = ColoredBox(
      color: Color(0xffdde6e7),
      child: Center(child: Icon(Icons.image_outlined, color: navy)),
    );
    if (path == null) return placeholder;
    try {
      return Image.network(
        catalog.photo(path!).toString(),
        width: double.infinity,
        fit: fit,
        errorBuilder: (_, _, _) => placeholder,
      );
    } on FormatException {
      return placeholder;
    }
  }
}

class _PhotoViewer extends StatefulWidget {
  const _PhotoViewer({
    required this.catalog,
    required this.photos,
    required this.initialPhoto,
  });

  final QuedoCatalog catalog;
  final List<String> photos;
  final int initialPhoto;

  @override
  State<_PhotoViewer> createState() => _PhotoViewerState();
}

class _PhotoViewerState extends State<_PhotoViewer> {
  late final PageController _pages = PageController(
    initialPage: widget.initialPhoto,
  );
  late int _index = widget.initialPhoto;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final count = widget.photos.length;
    return Scaffold(
      appBar: AppBar(title: Text('Foto ${_index + 1} de $count')),
      backgroundColor: navy,
      body: SafeArea(
        child: PageView.builder(
          controller: _pages,
          onPageChanged: (index) => setState(() => _index = index),
          itemCount: count,
          itemBuilder: (context, index) => StayPhoto(
            catalog: widget.catalog,
            path: widget.photos[index],
            fit: BoxFit.contain,
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: ColoredBox(
          color: Colors.white,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              if (count > 1)
                IconButton(
                  tooltip: 'Foto anterior',
                  onPressed: _index == 0
                      ? null
                      : () => _pages.jumpToPage(_index - 1),
                  icon: const Icon(Icons.chevron_left),
                ),
              TextButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
                label: const Text('Volver a la ficha'),
              ),
              if (count > 1)
                IconButton(
                  tooltip: 'Foto siguiente',
                  onPressed: _index + 1 == count
                      ? null
                      : () => _pages.jumpToPage(_index + 1),
                  icon: const Icon(Icons.chevron_right),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class SaveButton extends StatelessWidget {
  const SaveButton({super.key, required this.item, required this.saved});
  final Listing item;
  final SavedListings saved;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: saved,
      builder: (context, _) {
        final active = saved.contains(item.slug);
        return IconButton.filledTonal(
          tooltip: active ? 'Quitar de guardados' : 'Guardar estadía',
          icon: Icon(active ? Icons.favorite : Icons.favorite_border),
          onPressed: () async {
            try {
              await saved.toggle(item.slug);
            } catch (_) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('No se pudo guardar el cambio.'),
                  ),
                );
              }
            }
          },
        );
      },
    );
  }
}

class Notice extends StatelessWidget {
  const Notice({super.key, required this.message, this.retry});
  final String message;
  final VoidCallback? retry;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            if (retry != null)
              TextButton(onPressed: retry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

class ListingScreen extends StatefulWidget {
  const ListingScreen({
    super.key,
    required this.slug,
    required this.catalog,
    required this.saved,
  });
  final String slug;
  final QuedoCatalog catalog;
  final SavedListings saved;

  @override
  State<ListingScreen> createState() => _ListingScreenState();
}

class _ListingScreenState extends State<ListingScreen> {
  late Future<Listing> _listing;
  DateTimeRange<DateTime>? _range;
  int _photo = 0;

  @override
  void initState() {
    super.initState();
    _listing = widget.catalog.detail(widget.slug);
  }

  Future<void> _pickDates() async {
    final now = DateTime.now().toUtc().subtract(const Duration(hours: 5));
    final today = DateTime(now.year, now.month, now.day);
    final range = await showDateRangePicker(
      context: context,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      initialDateRange: _range,
    );
    if (mounted && range != null && range.start != range.end) {
      setState(() => _range = range);
    }
  }

  void _showMap(Listing listing) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('Ubicación aproximada')),
          body: SafeArea(
            child: QuedoMap(
              catalog: widget.catalog,
              initialDistrict: listing.district,
              priceLabel: cop,
              openListing: (item) {
                if (item.slug == listing.slug) {
                  Navigator.of(context).pop();
                } else {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ListingScreen(
                        slug: item.slug,
                        catalog: widget.catalog,
                        saved: widget.saved,
                      ),
                    ),
                  );
                }
              },
            ),
          ),
        ),
      ),
    );
  }

  void _openPhoto(Listing item, int index) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _PhotoViewer(
          catalog: widget.catalog,
          photos: item.photos,
          initialPhoto: index,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Estadía')),
      body: FutureBuilder<Listing>(
        future: _listing,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            final unavailable = snapshot.error is ListingUnavailable;
            return Notice(
              message: unavailable
                  ? 'Este alojamiento ya no está disponible.'
                  : 'No pudimos cargar la ficha.',
              retry: unavailable
                  ? null
                  : () => setState(
                      () => _listing = widget.catalog.detail(widget.slug),
                    ),
            );
          }
          final item = snapshot.data!;
          final range = _range;
          final nights = range == null
              ? 0
              : DateTime.utc(range.end.year, range.end.month, range.end.day)
                    .difference(
                      DateTime.utc(
                        range.start.year,
                        range.start.month,
                        range.start.day,
                      ),
                    )
                    .inDays;
          final day = DateFormat('yyyy-MM-dd');
          return SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: AspectRatio(
                    aspectRatio: 1.45,
                    child: item.photos.isEmpty
                        ? StayPhoto(catalog: widget.catalog, path: null)
                        : Stack(
                            children: [
                              PageView.builder(
                                itemCount: item.photos.length,
                                onPageChanged: (index) =>
                                    setState(() => _photo = index),
                                itemBuilder: (context, index) => InkWell(
                                  onTap: () => _openPhoto(item, index),
                                  child: StayPhoto(
                                    catalog: widget.catalog,
                                    path: item.photos[index],
                                  ),
                                ),
                              ),
                              Positioned(
                                right: 8,
                                bottom: 8,
                                child: IconButton.filledTonal(
                                  tooltip: 'Ampliar foto',
                                  onPressed: () => _openPhoto(item, _photo),
                                  icon: const Icon(Icons.fullscreen),
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                if (item.photos.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '${_photo + 1} de ${item.photos.length} fotos',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    item.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  subtitle: Text('${item.district}, ${item.city}'),
                  trailing: SaveButton(item: item, saved: widget.saved),
                ),
                if (item.city == 'Quibdó')
                  OutlinedButton.icon(
                    onPressed: () => _showMap(item),
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Ver zona en el mapa'),
                  ),
                if (item.demo)
                  const Text(
                    'Alojamiento de ejemplo. Fotografías y tarifas ilustrativas.',
                  ),
                Text(
                  '${item.capacity} huéspedes · ${item.bedrooms} habitaciones · ${item.beds} camas · ${item.bathrooms} baños',
                ),
                const SizedBox(height: 16),
                Text(
                  item.summary,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(item.description),
                if (item.amenities.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    children: item.amenities
                        .map((label) => Chip(label: Text(label)))
                        .toList(),
                  ),
                ],
                const SizedBox(height: 18),
                Text(
                  'Condiciones y cargos',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(item.rules),
                Text(item.additionalCosts),
                const SizedBox(height: 18),
                Text(
                  '${cop(item.price)} por noche',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (item.weeklyPrice != null)
                  Text('${cop(item.weeklyPrice!)} por semana'),
                OutlinedButton.icon(
                  onPressed: _pickDates,
                  icon: const Icon(Icons.date_range_outlined),
                  label: Text(
                    range == null
                        ? 'Consultar fechas'
                        : '${day.format(range.start)} a ${day.format(range.end)}',
                  ),
                ),
                if (nights > 0 && item.price > 0)
                  Text(
                    'Subtotal estimado por $nights noches: ${cop(item.price * nights)}',
                  ),
                const Text(
                  'Confirma disponibilidad, cargos y precio final con el anfitrión.',
                ),
                const SizedBox(height: 12),
                if (item.canContact)
                  FilledButton.icon(
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Consultar en Quedo'),
                    onPressed: () => openExternal(
                      context,
                      widget.catalog.web('/estadias/${item.slug}', {
                        if (range != null) 'llegada': day.format(range.start),
                        if (range != null) 'salida': day.format(range.end),
                      }),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key, required this.catalog});
  final QuedoCatalog catalog;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Tu cuenta Quedo',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        const Text(
          'Abre el acceso web seguro para iniciar sesión o administrar tu cuenta.',
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: () => openExternal(context, catalog.web('/acceso')),
          icon: const Icon(Icons.open_in_new),
          label: const Text('Abrir mi cuenta en Quedo'),
        ),
      ],
    );
  }
}

Future<void> openExternal(BuildContext context, Uri uri) async {
  try {
    if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
  } catch (_) {
    /* Show a recoverable error below. */
  }
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No pudimos abrir el navegador.')),
    );
  }
}
