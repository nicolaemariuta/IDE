clearvars;
readings = importdata('stationSibiu.csv');
sibiu = readings.data;

nrRows = 17*130;
sibiu2 = zeros(nrRows,3);


for i = 0:(nrRows-1)
    row = floor(i/17)+1;
    year = sibiu(row,1);
    month = mod(i,17)+1;
    
    temperature = sibiu(row,month+1);
    
    sibiu2(i+1,:) = [year, month, temperature];
end 

csvwrite('stationSibiu1.csv',sibiu2);