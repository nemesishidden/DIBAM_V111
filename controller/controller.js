/*
 *
 */
var pictureSource;
var destinationType; 
var montoUtilizado = 0;
var db;
var usuario;
var encontrados;
var eventos;
var app = {

    initialize: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.getElementById('logear').addEventListener('click', this.logear, false);        
        document.getElementById('scan').addEventListener('click', this.scan, false);
        document.getElementById('guardarLibro').addEventListener('click', this.guardarLibro, false);
        document.getElementById('solicitudesPorEnviar').addEventListener('click', this.obtenerSolicitudes, false);
        document.getElementById('solicitudesEnviadas').addEventListener('click', this.obtenerSolicitudesEnviadas, false);       
        document.getElementById('enviarSolicitud').addEventListener('click', this.confirmarEnvioSolicitud, false);
        //document.getElementById('eliminarSolicitudes').addEventListener('click', this.eliminarSolicitudes, false);
        document.getElementById('modificarLibro').addEventListener('click', this.modificarLibro, false);
        document.getElementById('eliminarLibro').addEventListener('click', this.eliminarLibro, false);

        
    },

    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },

    receivedEvent: function(id) {
        // var parentElement = document.getElementById(id);
        // var listeningElement = parentElement.querySelector('.listening');
        // var receivedElement = parentElement.querySelector('.received');

        // listeningElement.setAttribute('style', 'display:none;');
        // receivedElement.setAttribute('style', 'display:block;');

        console.log('Evento Recivido: ' + id);
        $('#username').focus();
    },

    scan: function() {
        if(window.usuario.evento.eventoActivo){
            var scanner = cordova.require("cordova/plugin/BarcodeScanner");
            scanner.scan(
                function (result) {
                    document.getElementById("precioReferencia").innerHTML = 0;
                    $('#formLibroNuevo')[0].reset();
                    if(result.text.toString().trim().length >=1){
                        app.buscarLibro(result.text);
                    }else{
                        $.mobile.changePage('#newSolicitudPag',{transition:"slide"});
                    }                
                }, 
                function (error) {
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('No se pudo establecer conexión con el servidor central, por favor, inténtelo en unos minutos más.');
                    $('#popupDialog').popup().popup('open');
                }
            );
            // document.getElementById("precioReferencia").innerHTML = 0;
            // $('#formLibroNuevo')[0].reset();
            // app.buscarLibro(9789568410575);
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('No hay ningún evento activo para su biblioteca.');
            $('#popupDialog').popup().popup('open');
        }
        
    },

    logear: function(){
        console.log('logear');
        $('.divResumen').find('p').remove();
        $.mobile.showPageLoadingMsg( "a", "Cargando...", false );
        var form = $("#formLogin").serializeArray();
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonLogin.asp',
            type: 'POST',
            timeout: 5000,
            dataType: 'json',
            data: {
                argUsuario: form[0].value.toLowerCase(),
                argClave: form[1].value
            },
            error : function(x, t, m) {
                $.mobile.hidePageLoadingMsg();
                if(t==="timeout") {
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('No se pudo establecer conexión con el servidor central, por favor, inténtelo en unos minutos más.');
                    $('#popupDialog').popup().popup('open');
                    //No se pudo establecer conexión con el servidor central, por favor, inténtelo en unos minutos más.
                } else {
                    $('#popupDialog').find('h1').text(t);
                    $('#popupDialog').find('h3').text('No se pudo establecer conexión con el servidor central, por favor, inténtelo en unos minutos más.');
                    $('#popupDialog').popup().popup('open');
                }
            },
            success: function (data) {
                if(data.success){
                    window.usuario = data.model;
                    var presupuestos = data.model.evento;
                    var pag = '#inicio';
                    $.mobile.changePage( pag, { transition: "slide"});
                    window.db = baseDatos.abrirBD();
                    window.db.transaction(
                        function(tx) {
                            // baseDatos.eliminarTablaPresupuesto(tx);
                            // baseDatos.eliminarTablaSolicitudesPorEnviar(tx);
                            baseDatos.tablaSolicitudesPorEnviar(tx);
                            baseDatos.tablaPresupuestos(tx);
                            baseDatos.verificarPresupuesto(tx, presupuestos, window.usuario.id);
                            baseDatos.obtenerPresupuestoId(tx, window.usuario);
                        }, baseDatos.errorTablaSolicitudes, baseDatos.successTablaSolicitudes );

                }else{
                    $.mobile.hidePageLoadingMsg();
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Usuario no registrado en el sistema. Por favor, contactar al administrador de su región.')
                    $('#popupDialog').popup().popup('open');
                }
            }
        });
    },

    formatValores: function(valor){
        var valorFormateado = '';
        var numero = valor.toString().replace(/\./g,'');
        while(numero.length > 3){
            valorFormateado = '.' + numero.substring(numero.length - 3) + valorFormateado;
            numero = numero.substring(0, numero.length - 3);
        }
        valorFormateado = numero + valorFormateado;
        return valorFormateado;
    },

    construirResumen: function(p){
        $('p').remove('.resumen');
        var $children = $('<p class="resumen"></p>');
        if(window.usuario.evento.eventoActivo){
            $children.html('<b>'+p.nombrePresupuesto+'</b><br />Evento válido hasta: '+p.fechaValidoHasta.toString()+' <br />Disponible: $'+app.formatValores(p.disponiblePresupuesto)+' / Utilizado: $'+app.formatValores(p.utilizado)+' ');
        }else{
            $children.html('<b>No hay ningún evento activo para su biblioteca</b> ');
        }        
        $('.divResumen').append($children);
    },

    obtenerSolicitudes: function(){
        if(window.usuario.evento.eventoActivo){
            var pag = '#solicitudesPorEnviarPag';
            var idEvento = window.usuario.evento.id;
            window.db.transaction(function(tx) {
                baseDatos.obtenerSolicitudesPorEnviar(tx, window.usuario);
                baseDatos.obtenerPresupuestoId(tx, window.usuario);
            }, baseDatos.errorTablaSolicitudes, function(tx){
                //$.mobile.changePage(pag,{transition: "slide"});
            });
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('No hay ningún evento activo para su biblioteca.')
            $('#popupDialog').popup().popup('open');
        }
        
    },

    obtenerSolicitudesEnviadas: function(){
        $.mobile.showPageLoadingMsg( 'a', "Cargando...", false );
        var pag = '#solicitudesEnviadasPag'
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonSolicitudesEnviadas.asp',
            type: 'POST',
            timeout: 5000,
            dataType: 'json',
            data: {
                argUsuarioId: window.usuario.id
            },
            error : function (){
                document.title='error';
            }, 
            success: function (data) {
                if(data.success){
                    window.eventos = data.model;
                    var len = data.model.length;
                    var $ulLista = $('#listSolEnviadas');
                    $ulLista.find('li').remove('li');

                    if(len >= 1){
                        data.model.forEach(function(e){
                            var $elemento = $('<li></li>'); 
                            $elemento.html('<a href="" onClick="app.irEvento('+e.EventoId+') "id="evento-'+e.EventoId+'">'+e.Nombre+'<br />'+e.FechaEnvioSolicitud+'</a>');
                            $ulLista.append($elemento).trigger('create');
                        });
                    }
                    if ($ulLista.hasClass('ui-listview')) {
                        $ulLista.listview('refresh');
                    } else {
                        $ulLista.trigger('create');
                    }
                    $.mobile.changePage(pag, {transition: "slide"});    
                }else{
                    $.mobile.hidePageLoadingMsg();
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text(data.model.error);
                    $('#popupDialog').popup().popup('open');
                }
            }
        });
    },

    actualizaTotal: function(cantidad, idElemento, idTotal){
        var cantidadLibros;
        var actualizaPrecio;
        var actualizaCantidad;
        var valor = $('#'+idElemento).val();
        isNaN(parseInt(cantidad, 10)) ? cantidadLibros = parseInt($('#'+cantidad).val(), 10) : cantidadLibros = parseInt(cantidad, 10);
        if(valor >= 300001 && (idElemento == 'precioReferencia' || idElemento == 'precioReferenciaE')){
            console.log('valor muy alto');
            actualizaPrecio = false; 
            idElemento == 'precioReferencia' ? $('#precioReferencia').val(1): $('#precioReferenciaE').val(1);           
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Solo se permite un precio hasta $300.000.');            
        }else{
            actualizaPrecio = true;
        }
        if(cantidadLibros >= 201){
            console.log('cantidad muy alto');
            actualizaCantidad = false;
            idElemento == 'precioReferencia' ? $('#cantidad').val(1): $('#cantidadE').val(1);
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('solo se permite un máximo de 200 ejemplares.');            
        }else{
            actualizaCantidad = true;
        }

        if(actualizaPrecio && actualizaCantidad){
            var total = parseInt(valor, 10)*cantidadLibros;
            total = app.formatValores(total);
            $('#'+idTotal).text(total!= 'NaN'?total:0); 
        }else{
            $('#'+idTotal).text('0');
            $('#popupDialog').popup().popup('open');
        }
    
    },

    irEvento: function(eId){
        window.eventos.forEach(function(e){
            if(eId == e.EventoId){
                $('#tablaSolPorEnviar').find('table').remove('table');
                var $tabla = $('<table></table>');
                $tabla.attr('data-role', 'table').attr('data-mode', 'reflow').attr('id','tablaResumenEvento');
                $tabla.find('tbody').remove('tbody');
                $tabla.find('thead').remove('thead');
                $('#tablaSolPorEnviar').find('#btnVerLibros').remove('#btnVerLibros');
                $tabla.append('<thead>').children('thead').append('<tr />').children('tr').append('<th>Evento:</th><th>Monto Total:</th><th>Fecha env&iacute;o:</th><th>Utilizado:</th><th>Estado:</th>');
                $tabla.append('<tbody>').children('tbody').append('<tr />').children('tr').append('<td>'+e.Nombre+'</td><td>$ '+app.formatValores(e.totalPresupuesto)+'</td><td>'+e.FechaEnvioSolicitud.toString()+'</td><td>$ '+app.formatValores(e.PresupuestoUtilizado)+'</td><td> '+ (e.Resumen != undefined ? e.Resumen: 'No Informado') +'</td>');
                var $center = $('<center></center>');
                var $btnVerLibros = $('<a></a>');
                $btnVerLibros.attr('data-role', 'button').attr('data-inline', 'true').attr('id', 'btnVerLibros').attr('data-icon', 'bars');
                $btnVerLibros.html('Ver Libros');
                $center.append($btnVerLibros);
                $btnVerLibros.attr('onClick', 'app.irVerLibros('+e.EventoId+',"'+e.Nombre+'","'+e.FechaEnvioSolicitud.toString()+'")');
                $('#tablaSolPorEnviar').append($tabla).trigger('create');
                $('#tablaSolPorEnviar').append($center).trigger('create');
            }
        });
        $.mobile.changePage( '#detalleSolicitud', { transition: "slide"} ); 
    },

    irEditarLibro: function(idLibro){
        console.log(idLibro);
        window.db.transaction(function(tx) {
            baseDatos.obtenerLibroId(tx, idLibro);
        }, baseDatos.errorTablaSolicitudes, function(tx){
            app.actualizaTotal($('#cantidadE').val(), 'precioReferenciaE', 'totalPresupuestoE');
            $.mobile.changePage('#editarSolicitudPag',{transition: "slide"});
        } );

    },

    irVerLibros: function(idEvento, nombreEvento, fechaEvento){
        $('#tituloEvento').text(nombreEvento);
        $('#fechaEvento').text(fechaEvento);
        $.mobile.showPageLoadingMsg( 'a', "Cargando...", false );
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonSolicitudDetalle.asp',
            type: 'POST',
            timeout: 5000,
            dataType: 'json',
            data: {
               argUsuarioId: window.usuario.id,
               argEventoId: idEvento
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {                
                if(data.success){
                    var len = data.model.libros.length;
                    var $ulLista = $('#librosSolicitudesEnviadas');
                    $ulLista.find('li').remove('li');
                    if(len >= 1){
                        data.model.libros.forEach(function(libro){
                            var $elemento = $('<li></li>');
                            var chk = '<p class="lblNombreLibro">'+libro.Titulo+'</p><p class="lblAutor">Autor: '+libro.Autor+'</p><p class="lblPrecio">Precio: $'+app.formatValores(libro.Precio)+'</p><p class="lblCantidad">Cantidad: '+libro.Cantidad+'</p>';
                            $elemento.html(chk);
                            $ulLista.append($elemento).trigger('create');
                        });                        
                    }
                    if ($ulLista.hasClass('ui-listview')) {
                        $ulLista.listview('refresh');
                    } else {
                        $ulLista.trigger('create');
                    }
                    $.mobile.changePage('#librosEnviadosPag',{transition: "slide"});
                }else{
                    $.mobile.hidePageLoadingMsg();
                }
            }
        });
    },

    buscarNotScann:function(){
        var isbn = $('#isbn').val();
        console.log(isbn);
        $.mobile.showPageLoadingMsg( "a", "Buscando...", false );
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonLibro.asp',
            type: 'POST',
            timeout: 5000,
            dataType: 'json',
            data: {
               argISBN: isbn
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {
                if(isbn.toString().length != 0){
                    if(data.success){
                        var a = data.model;
                        app.actualizaTotal(0, 'precioReferencia', 'totalPresupuesto');
                        $.mobile.hidePageLoadingMsg();
                        $('#isbn').val(a.isbn);
                        $('#titulo').val(a.titulo);
                        $('#autor').val(a.autor);
                        $('#precioReferencia').val('');
                        $('#cantidad').val('');                       
                        $('#totalPresupuesto').text('0');
                    }else{
                        $('#titulo').val('');
                        $('#autor').val('');
                        $('#precioReferencia').val('');
                        $('#cantidad').val('');                       
                        $('#totalPresupuesto').text('0');
                        $.mobile.hidePageLoadingMsg();
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.error+'\nPor favor, ingréselo manualmente.');
                        $('#popupDialog').popup().popup('open');
                    }
                }                
            }
        });
    },

    buscarLibro: function(codigoIsbn){
        $.mobile.showPageLoadingMsg( "a", "Buscando...", false );
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonLibro.asp',
            type: 'POST',
            timeout: 5000,
            dataType: 'json',
            data: {
               argISBN: codigoIsbn
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {
                if(isbn.toString().length != 0){
                    if(data.success){
                        var a = data.model;
                        app.actualizaTotal(0, 'precioReferencia', 'totalPresupuesto');
                        $('#isbn').val(a.isbn);
                        $('#titulo').val(a.titulo);
                        $('#autor').val(a.autor);
                        $('#titulo').focus();
                        $.mobile.changePage( '#newSolicitudPag', { transition: "slide"} );
                    }else{
                        $.mobile.hidePageLoadingMsg();
                        $.mobile.changePage( '#newSolicitudPag', { transition: "slide"} );
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.error+'\nPor favor ingreselo manualmente.');
                        $('#popupDialog').popup().popup('open');
                        $('#isbn').val(codigoIsbn);
                        $('#isbn').focus();
                    }
                    // $.mobile.changePage( '#newSolicitudPag', { transition: "slide"} );
                }                
            }
        });
    },

    guardarLibro: function(){
        console.log('guardarLibro idEvento: '+window.usuario.evento.id);
        var guardar = false;
        if(document.getElementById("isbn").value.trim().length <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo ISBN.');
            $('#popupDialog').popup().popup('open');
        }else if(isNaN($('#isbn').val())){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('El campo ISBN debe ser solo números.');
            $('#popupDialog').popup().popup('open');
        }else if(document.getElementById("titulo").value.trim().length <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo Título.');
            $('#popupDialog').popup().popup('open');
        }else if(document.getElementById("autor").value.trim().length <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo Autor.');
            $('#popupDialog').popup().popup('open');
        }else if(parseInt(document.getElementById("precioReferencia").value) <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('El precio por ejemplar debe ser mayor que 1 peso.');
            $('#popupDialog').popup().popup('open');
        }else if(parseInt(document.getElementById("cantidad").value) <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('El número de ejemplares a solicitar debe ser mayor o igual a 1.');
            $('#popupDialog').popup().popup('open');
        }else{
            guardar = true;
        }
        if(guardar){
            var libro = {
                isbn: document.getElementById("isbn").value,
                nombre_libro: document.getElementById("titulo").value,
                valor_referencia: document.getElementById("precioReferencia").value,
                cantidad: document.getElementById("cantidad").value,
                autor: document.getElementById("autor").value
            };
            window.db.transaction(function(tx){
                tx.executeSql('select * from Presupuestos where idPresupuesto='+window.usuario.evento.id+' and idUsuario='+window.usuario.id, [], function(tx, results){
                    var resultado;
                    if(results.rows.length != 0){
                        var len = results.rows.length;
                        
                        console.log('ya existe');
                        for (var i=0; i<len; i++){
                            resultado = results.rows.item(i);
                        }                        
                    }
                    app.reciveData(resultado, libro);
                }, function(tx){
                    console.log('error');
                });
            },function(r){
                console.log(r);
            },function(r){
                console.log(r);
            });
            // window.db.transaction(function(tx) {
            //     baseDatos.verificarLibro(tx,libro, window.usuario);
            // }, baseDatos.errorGuardarLibro, baseDatos.successGuardarLibro);
        }
    },
    reciveData: function(valores, libro){
        console.log(valores);
        console.log(libro);
        var a = parseInt(libro.valor_referencia, 10);
        var b = parseInt(libro.cantidad, 10);
        var z = a*b;
        var x = valores.disponiblePresupuesto - z;
        console.log(x);
        if(x >= -1){
            window.db.transaction(function(tx) {
                baseDatos.verificarLibro(tx,libro, window.usuario);
            }, baseDatos.errorGuardarLibro, baseDatos.successGuardarLibro);
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('El monto excede al que usted tiene disponible.');
            $('#popupDialog').popup().popup('open');
        }

    },

    eliminarSolicitudes: function(){
        var largoArray = $('#listadoSolicitudesPorEnviar').find('li').find('input:checked').length;
        var librosEliminar = new Array(largoArray);
        var i = 0;
        $('#listadoSolicitudesPorEnviar').find('li').find('input:checked').each(function(e, b){
            librosEliminar[i] = b.id.split('-')[1];
            i++;
        });
        if(librosEliminar.length >= 1){
            window.db.transaction(function(tx){
               baseDatos.borrarLibro(tx, librosEliminar, window.usuario);
            }, baseDatos.errorBuscarLibroEnvio, function(){
                window.db.transaction(function(tx) {
                    baseDatos.updatePresupuestoFinal(tx, window.usuario);
                }, function(tx){
                    console.log('error al update del presupuesto');
                }, function(tx){
                    console.log('presupuesto actualizado');
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Libro eliminado con exito.');
                    $('#popupDialog').popup().popup('open');
                    var pag = '#inicio';
                    $.mobile.changePage( pag, { transition: "slide"});
                });                
            });
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe seleccionar al menos un libro para eliminar.');
            $('#popupDialog').popup().popup('open');
        }
        
    },

    eliminarLibro: function(isbn){
        var isbn = $('#isbnE:input').val();
        window.db.transaction(function(tx) {
            baseDatos.eliminarLibro(tx, isbn, window.usuario);
        }, baseDatos.errorUpdateLibro, function(tx){
            window.db.transaction(function(tx) {
                baseDatos.updatePresupuestoFinal(tx, window.usuario);
            }, function(tx){
                console.log('error al update del presupuesto');
            }, function(tx){
                console.log('presupuesto actualizado');
            });
            window.app.obtenerSolicitudes();
        });        
    },

    confirmarEnvioSolicitud: function(){
        $('#confirm-dialog').find('h1').text('Advertencia');
        $('#confirm-dialog').find('h3').text('¿Esta seguro que desea enviar la solicitud?.');
        $('#confirm-dialog').popup().popup('open'); 
    },

    enviarSolicitud: function(){        
        window.db.transaction(function(tx) {
            tx.executeSql('select * from Solicitudes_por_enviar where idUsuario='+window.usuario.id+' and idPresupuesto='+window.usuario.evento.id, [], function(tx, results){

                var len = results.rows.length;
                var libros = new Array(len);
                for (var i=0; i<len; i++){
                    var r = results.rows.item(i);
                    console.log(r);
                    var libro = {
                        codigoISBN: r.isbn,
                        Titulo: r.nombre_libro,
                        Autor: r.autor,
                        Cantidad: r.cantidad,
                        Precio: r.valor_referencia
                    };
                    libros[i] = libro;
                }
                app.enviarDibam(libros);

            }, function(tx){
                console.log("error");
            });
        }, function(tx){
            //error
        }, function(tx){
            //exito
        });
        
    },

    enviarDibam: function(sol){
        $.mobile.showPageLoadingMsg( "a", "Cargando...", false );
        var solicitud = {
            model: {
                eventoId: window.usuario.evento.id,
                usuarioId: window.usuario.id,
                libros: sol
            }
        };
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonRecibeSolicitud.asp',
            type: 'POST',
            timeout: 5000,
            dataType: 'json',
            data: {
               argJSON: JSON.stringify(solicitud)
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {                
                if(data.success){
                    window.usuario.evento.eventoActivo = false;
                    app.sincronizaPresupuesto();
                    $.mobile.changePage( '#inicio', {transition: "slide"});
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Los libros enviados han sido recibidos correctamente, su solicitud será procesada por el encargado correspondiente. \nGracias.');
                    $('#popupDialog').popup().popup('open');
                }else{
                    $.mobile.hidePageLoadingMsg();
                    $.mobile.changePage( '#inicio', {transition: "slide"});
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text(data.model.error);
                    $('#popupDialog').popup().popup('open');                    
                }
            }
        });
        // window.db.transaction(function(tx) {
        //     baseDatos.borrarLibro(tx, window.usuario);
        // }, baseDatos.errorTablaSolicitudes, function(tx){
        //     alert('Su solicitud ha sido enviada con exito.');
        //     $.mobile.changePage( '#inicio', {transition: "slide"});
        // } );
    },

    modificarLibro: function(){
        console.log('Modificando libro');
        var libro = {
            idLibro : $('#idLibro:input').val(),
            isbn: $('#isbnE:input').val(),
            titulo: $('#tituloE:input').val(),
            autor: $('#autorE:input').val(),
            valor: $('#precioReferenciaE:input').val(),
            cantidad: $('#cantidadE:input').val()
        };
        window.db.transaction(function(tx) {
            baseDatos.updateLibro(tx, libro);
        }, baseDatos.errorUpdateLibro, function(tx){   
            console.log('El libro ha sido modificado con éxito.');
            window.db.transaction(function(tx) {
                baseDatos.updatePresupuestoFinal(tx, window.usuario);
            }, function(tx){
                console.log('error al update del presupuesto');
            }, function(tx){
                console.log('presupuesto actualizado');
            });
            window.app.obtenerSolicitudes();
        });
    },

    actualizaPresupuesto: function(valorTotal){
        console.log(valorTotal);
        window.db.transaction(function(tx) {
            baseDatos.updatePresupuesto(tx, valorTotal, window.usuario);
        }, function(tx){
            console.log('error al update del presupuesto');
        }, function(tx){
            console.log('presupuesto actualizado');
            app.sincronizaPresupuesto();            
        });
    },

    sincronizaPresupuesto: function(){
        window.db.transaction(function(tx) {
            baseDatos.verificarPresupuesto(tx, window.usuario.evento, window.usuario.id);
        }, function(tx){
            console.log('error sincronizaPresupuesto');
        }, function(tx){
            console.log('success sincronizaPresupuesto');            
        });
    },

    contactenos: function(){
        $.mobile.showPageLoadingMsg( "a", "Cargando...", false );
        if($('#mensajeContacto').val().trim().length >= 1){
            $.ajax({
                url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonContactenos.asp',
                type: 'POST',
                timeout: 5000,
                dataType: 'json',
                data: {
                   argUsuarioId: window.usuario.id,
                   argMensaje: $('#mensajeContacto').val()
                },
                error : function (){ document.title='error'; }, 
                success: function (data) {                
                    if(data.success){
                        $.mobile.hidePageLoadingMsg();
                        $.mobile.changePage( '#inicio', {transition: "slide"});
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text('Su mensaje ha sido enviado exitosamente. El administrador se comunicará con usted para atenderlo.');
                        //$('#popupDialog').find('h3').text(data.model.mensaje);
                        $('#popupDialog').popup().popup('open');                        
                        $('#mensajeContacto').val('');
                    }else{
                        $.mobile.hidePageLoadingMsg();
                        $.mobile.changePage( '#inicio', {transition: "slide"});
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.mensaje);
                        $('#popupDialog').popup().popup('open');                        
                        $('#mensajeContacto').val('');
                    }
                }
            });
        }else{
            $.mobile.hidePageLoadingMsg();
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Por favor, ingresar Mensaje.');
            $('#popupDialog').popup().popup('open');

        }
    }
};

