<?php
namespace App\Reports;
use Symfony\Component\HttpFoundation\StreamedResponse;

class Csv {
    // Column order and Spanish names are part of the existing analysis files' contract.
    private const COLUMNS = [
        'resumen'=>'datos desde_bogota hasta_bogota_inclusive corte_utc indicador valor unidad definicion',
        'embudo'=>'datos desde_bogota hasta_bogota etapa sesiones porcentaje_base porcentaje_etapa_anterior',
        'anuncios'=>'datos anuncio_id titulo anfitrion_id barrio tipo estado_actual tarifa_noche_cop vistas_periodo sesiones_ficha contactos_periodo sesiones_contacto conversion_ficha_contacto_pct estadias_reportadas actualizado_utc',
        'contactos'=>'datos contacto_id anuncio_id titulo anfitrion_id sesion_id origen iniciado_utc estado_al_corte ultimo_motivo ultima_nota',
        'eventos'=>'datos contacto_id anuncio_id evento_id estado motivo nota registrado_utc actor_id',
        'vistas'=>'datos vista_id anuncio_id sesion_id origen registrada_utc',
        'diario'=>'datos dia_bogota vistas sesiones_ficha contactos_iniciados',
        'anfitriones'=>'datos anfitrion_id nombre correo alta_utc estado_plan_al_corte plan_al_corte tarifa_mensual_cop',
        'planes'=>'datos evento_id anfitrion_id estado plan tarifa_mensual_cop efecto_utc registrado_utc nota actor_id',
        'cohortes'=>'datos mes_primera_activacion anfitriones_cohorte M0_pct M1_pct M2_pct M3_pct M4_pct M5_pct corte_utc',
    ];
    private const KEYS = [
        'resumen'=>'from to cutoff indicador valor unidad definicion','embudo'=>'from to etapa sesiones porcentaje_de_vistas paso',
        'anuncios'=>'id title hostId district type status priceNight vistas sesiones contactos vinculadas conversion confirmadas updatedAt',
        'contactos'=>'id listingId title hostId visitId source createdAt status lossReason note','eventos'=>'contactId listingId id status lossReason note createdAt actorId',
        'vistas'=>'id listingId visitId source createdAt','diario'=>'fecha vistas sesiones contactos','anfitriones'=>'id name email createdAt estado plan tarifa',
        'planes'=>'id hostId status plan monthlyPrice effectiveAt createdAt note actorId','cohortes'=>'mes anfitriones M0 M1 M2 M3 M4 M5 cutoff',
    ];
    private const METRICS = [
        'Vistas de fichas'=>['vistas_fichas','eventos','Vistas registradas por sesión y anuncio'],
        'Sesiones con ficha vista'=>['sesiones_con_ficha','sesiones','Sesiones que vieron al menos una ficha'],
        'Consultas iniciadas'=>['contactos_iniciados','clics','Aperturas del contacto en el período'],
        'Sesiones con estadía reportada'=>['sesiones_estadia_reportada','sesiones','Sesiones con ficha vista y estadía reportada manualmente al corte'],
        'Conversión ficha a contacto (%)'=>['conversion_ficha_contacto','%','Sesiones con ficha y contacto divididas por sesiones con ficha'],
        'Conversión ficha a estadía reportada (%)'=>['conversion_ficha_estadia_reportada','%','Sesiones con estadía reportada al corte divididas por sesiones con ficha'],
        'Anfitriones activos al inicio'=>['activos_inicio','anfitriones','Activos antes del inicio del período'],
        'Cancelaciones de la base inicial'=>['bajas_base_inicial','anfitriones','Anfitriones de la base inicial con una cancelación'],
        'Churn de anfitriones (%)'=>['churn_anfitriones','%','Bajas de la base inicial divididas por activos al inicio'],
        'Anfitriones activos al corte'=>['activos_corte','anfitriones','Último estado de plan activo al corte'],
        'MRR registrado (COP)'=>['mrr_contratado_manual','COP/mes','Suma de tarifas de planes activos registrados manualmente'],
        'Activación de pruebas (%)'=>['conversion_prueba_activo','%','Primeras pruebas del período activadas antes del corte'],
    ];
    public static function download(string $dataset,array $report): StreamedResponse {
        $scope=$report['demo']?'prueba':'reales';
        $file="quedo-$dataset-$scope-{$report['from']}-{$report['to']}.csv";
        return response()->streamDownload(function() use($dataset,$report) {
            $stream=fopen('php://output','wb');
            fwrite($stream,"\xEF\xBB\xBF");
            fputcsv($stream,explode(' ',self::COLUMNS[$dataset]),';','"','',"\r\n");
            $keys=explode(' ',self::KEYS[$dataset]);
            foreach($report['datasets'][$dataset] as $row) {
                $row+=array_intersect_key($report,array_flip(['from','to','cutoff']));
                if($dataset==='resumen') [$row['indicador'],$row['unidad'],$row['definicion']]=self::METRICS[$row['indicador']];
                $values=[$report['demo']?'PRUEBA / SIMULADO':'REAL'];
                foreach($keys as $key) {
                    $value=$row[$key]??'';
                    if(is_float($value)) $value=str_replace('.',',',(string)$value);
                    if(is_string($value) && preg_match('/^\s*[=+@-]|^[\t\r\n]/u',$value)) $value="'".$value;
                    $values[]=$value;
                }
                fputcsv($stream,$values,';','"','',"\r\n");
            }
            fclose($stream);
        },$file,['Content-Type'=>'text/csv; charset=UTF-8','Cache-Control'=>'private, no-store']);
    }
}
