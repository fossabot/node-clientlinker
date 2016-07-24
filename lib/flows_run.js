var Promise		= require('bluebird');
var debug		= require('debug')('client_linker:flow_run');
var isPromise	= require('is-promise');

exports.FlowsRun = FlowsRun;
function FlowsRun(runtime)
{
	this.runtime = runtime;
	this.runnedFlows = [];
}

FlowsRun.prototype = {
	run: function()
	{
		var runtime = this.runtime;
		var callback = this.callbackDefer_();
		var timing = runtime.timing = this.timing
			= {flowsStart: Date.now()};

		this.promise = runtime.promise = callback.promise
			= callback.promise.then(function(data)
				{
					timeEnd();
					return data;
				},
				function(err)
				{
					timeEnd();
					throw err;
				});

		function timeEnd()
		{
			timing.flowsEnd = Date.now();
		}

		return this.run_(callback);
	},

	lastFlow: function()
	{
		var list = this.runnedFlows;
		var index = list.length;
		while(index--)
		{
			if (list[index]) return list[index];
		}
	},

	run_: function(callback)
	{
		var self = this;
		var runtime = self.runtime;
		var client = runtime.client;
		var clientFlows = client.options.flows;
		var flow = self.next_();
		callback.flow = flow;

		if (!flow) return callback.reject('CLIENTLINKER:CLIENT FLOW OUT,'
			+runtime.methodKey
			+','+clientFlows.length);

		callback.timing.start = Date.now();
		self.runnedFlows.push(callback);

		debug('run %s.%s flow:%s(%d/%d)',
			client.name,
			runtime.methodName,
			flow.name,
			self.runnedFlows.length,
			clientFlows.length);

		try {
			var ret = flow.call(self, runtime, callback);
			if (isPromise(ret)) ret.catch(callback.reject);
		}
		catch(err)
		{
			callback.reject(err);
		}

		return callback.promise;
	},
	
	next_: function()
	{
		var flow;
		var client = this.runtime.client;

		for(var linkerFlows = client.linker.flows,
			clientFlows = client.options.flows,
			index = this.runnedFlows.length;
			flow = clientFlows[index];
			index++)
		{
			var type = typeof flow;
			if (type == 'string')
			{
				flow = linkerFlows[flow];
				type = typeof flow;
			}
			
			if (type == 'function')
				break;
			else
				this.runnedFlows.push(null);
		}

		return flow;
	},
	// 注意：要保持当前的状态
	// 中间有异步的逻辑，可能导致状态改变
	callbackDefer_: function()
	{
		var self	= this;
		var client	= self.runtime.client;
		var inited	= self.inited;

		var resolve, reject;
		var promise = new Promise(function(resolve0, reject0)
			{
				resolve = resolve0;
				reject = reject0;
			})
			.then(function(data)
			{
				timeEnd();
				return data;
			},
			function(err)
			{
				timeEnd();

				// 将错误信息转化为Error对象
				if (client.options.anyToError && !(err instanceof Error))
				{
					err = client.linker.anyToError(err);
				}

				// 方便定位问题
				if (err && typeof err == 'object')
				{
					err.fromClient || (err.fromClient = self.runtime.client.name);
					err.fromClientFlow || (err.fromClientFlow = callback.flow && callback.flow.name);
					err.fromClientMethod || (err.fromClientMethod = self.runtime.methodName);
				}

				throw err;
			});

		function callback(ret, data)
		{
			ret ? callback.reject(ret) : callback.resolve(data);
		}

		function next(async)
		{
			var promise = self.run_(self.callbackDefer_());
			if (!async) promise.then(callback.resolve, callback.reject);
			return promise;
		}

		function timeEnd()
		{
			callback.timing.end = Date.now();
		}

		callback.promise	= promise;
		callback.resolve	= resolve;
		callback.reject		= reject;
		callback.next		= next;
		callback.timing		= {};

		return callback;
	}
};
