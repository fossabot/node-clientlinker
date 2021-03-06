'use strict';

var Promise			= require('bluebird');
var clientlinker	= require('../');
var expect			= require('expect.js');

describe('#deps', function()
{
	it('#runOptions', function()
	{
		var linker = clientlinker(
		{
			flows: ['custom'],
			customFlows: {
				custom: function flow(runtime, callback)
				{
					expect(runtime.runOptions.param).to.be('pp');
					runtime.runOptions.param = 'p1';
					expect(runtime.options.param).to.be('p1');
					runtime.runOptions = {param: 'p2'}
					expect(runtime.options.param).to.be('p2');

					callback.callback();
				}
			},
			clients:
			{
				client: {}
			}
		});

		return linker.run('client.method', null, null, null, {param: 'pp'});
	});


	it('#navigationStart', function()
	{
		var linker = clientlinker();
		var promise = linker.run('client.method');
		var runtime = linker.lastRuntime;

		return promise.then(function(){expect().fail()},
			function()
			{
				var navigationStart = runtime.timing.navigationStart;
				expect(navigationStart).to.be.a('number');
				expect(navigationStart).to.be(runtime.navigationStart);
			});
	});


	it('#runByKey', function()
	{
		var linker = clientlinker(
		{
			flows: ['confighandler'],
			clients:
			{
				client:
				{
					confighandler:
					{
						method: function(query, body, callback)
						{
							callback.callback();
						}
					}
				}
			}
		});

		linker.flow('confighandler', require('clientlinker-flow-confighandler'));

		return Promise.all(
			[
				linker.runByKey('client.method'),
				linker.runByKey('client:method')
			]);
	});


	// it('#proxyRoute', function()
	// {
	// 	var linker = clientlinker()
	//
	// 	expect(linker.proxyRoute().name).to.be('HttpProxyRouteHandle');
	// });


	it('#add', function()
	{
		var linker = clientlinker()
		linker.add('clientName1', {opt: 'myOpt'});

		return linker.clients()
			.then(function(map)
			{
				expect(map).to.be.an('object');
				expect(map.clientName1.name).to.be('clientName1');
				expect(map.clientName1.options).to.be.eql({opt: 'myOpt'});
			});
	});


	it('#clientDefaultOptions', function()
	{
		var linker = clientlinker(
		{
			clientDefaultOptions:
			{
				opt: 'default',
				some: 'hihi'
			},
			clients:
			{
				client1: null,
				client2:
				{
					opt: 'myOpt'
				}
			}
		});

		linker.options.clientDefaultOptions = {opt: 'newOpt'};
		linker.addClient('client3');
		linker.addClient('client4', {some: 'ctd'});

		return linker.clients()
			.then(function(map)
			{
				expect(map.client1.options).to.be.eql(
					{
						opt: 'default',
						some: 'hihi'
					});

				expect(map.client2.options).to.be.eql(
					{
						opt: 'myOpt',
						some: 'hihi'
					});

				expect(map.client3.options).to.be.eql(
					{
						opt: 'newOpt'
					});

				expect(map.client4.options).to.be.eql(
					{
						opt: 'newOpt',
						some: 'ctd'
					});
			});
	});


	it('#loadFlow', function()
	{
		var linker = clientlinker()
		var flow = linker.loadFlow('flow_empty', './deps/flows/flow_empty', module);
		expect(flow).to.not.be.ok();
		flow = linker.loadFlow('flow_resolve', './deps/flows/flow_resolve', module);
		expect(flow).to.be.ok();
		flow = linker.loadFlow('flow_next', './deps/flows/flow_next', module);
		expect(flow).to.be.ok();

		linker.addClient('client1',
		{
			flows: ['flow1', 'flow_empty', 'flow_next', 'flow_resolve']
		});

		return linker.run('client1.xxxx')
			.then(function(data)
			{
				expect(data).to.be('flow_resolve');
			});
	});


	it('#methodKey', function()
	{
		var linker = clientlinker();
		linker.run('client.method').catch(function(){});
		var runtime = linker.lastRuntime;

		expect(runtime.methodKey).to.be('client.method')
			.be(runtime.action);
	});


	it('#parseMethodKey', function()
	{
		var linker = clientlinker(
			{
				clients:
				{
					client: null
				}
			});

		return Promise.all(
			[
				linker.parseMethodKey('client.method'),
				linker.parseAction('client.method')
			])
			.then(function(data)
			{
				expect(data[0].client.name).to.be('client');
				expect(data[0].method).to.be('method');
				expect(data[0]).to.eql(data[1]);
			});
	});
});
